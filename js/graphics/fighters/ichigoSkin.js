import { getHandSize, CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawPixelHand } from '../renderers/fighterRenderer.js';
import { drawTensaZangetsuKatana, drawBankaiSwordOrbitingAura, _getShikaiSwordImage, _getShikaiSwordBladeImage } from '../weapons/ichigoWeaponGraphics.js';

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

let _ichigoBankaiImage = null;
let _ichigoBankaiImageLoading = false;

function _getIchigoBankaiImage() {
  if (_ichigoBankaiImage && _ichigoBankaiImage.complete && _ichigoBankaiImage.naturalWidth > 0) {
    return _ichigoBankaiImage;
  }
  if (!_ichigoBankaiImageLoading && typeof Image !== 'undefined') {
    _ichigoBankaiImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _ichigoBankaiImage = img;
      _ichigoBankaiImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Ichigo Bankai pixel image at Assets/model/ichigo-bankai-skin.png', e);
      _ichigoBankaiImageLoading = false;
    };
    img.src = 'Assets/model/ichigo-bankai-skin.png?v=1';
    _ichigoBankaiImage = img;
  }
  return _ichigoBankaiImage;
}

let _ichigoShikaiImage = null;
let _ichigoShikaiImageLoading = false;

function _getIchigoShikaiImage() {
  if (_ichigoShikaiImage && _ichigoShikaiImage.complete && _ichigoShikaiImage.naturalWidth > 0) {
    return _ichigoShikaiImage;
  }
  if (!_ichigoShikaiImageLoading && typeof Image !== 'undefined') {
    _ichigoShikaiImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _ichigoShikaiImage = img;
      _ichigoShikaiImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Ichigo Shikai pixel image at Assets/model/ichigo-shikai-skin.png', e);
      _ichigoShikaiImageLoading = false;
    };
    img.src = 'Assets/model/ichigo-shikai-skin.png?v=1';
    _ichigoShikaiImage = img;
  }
  return _ichigoShikaiImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getHollowMaskImage();
  _getIchigoBankaiImage();
  _getIchigoShikaiImage();
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
    (fighter.electricStunTimer && fighter.electricStunTimer > 0) ||
    (fighter.paralyzeTimer && fighter.paralyzeTimer > 0) ||
    (fighter.hitStunTimer && fighter.hitStunTimer > 0) ||
    fighter.isParalyzed ||
    fighter.isGrabbedByMahoraga ||
    fighter.isParalyzedByMahoraga ||
    fighter.isWallSlammed ||
    fighter.wallSlamPinnedX !== undefined ||
    fighter.isTargetOfAmbush
  );

  const isBackSlungPose = Boolean(
    fighter._isWinnerReveal || 
    (typeof state !== 'undefined' && (
      state.gameState === 'weapons' ||
      state.gameState === 'weaponDetail' ||
      state.gameState === 'weaponStudio' ||
      state.gameState === 'weaponIndex' || 
      state.gameState === 'faceoff' ||
      state.gameState === 'select' ||
      state.gameState === 'index' ||
      state.gameState === 'indexDetail' ||
      state.gameState === 'characterSelect' || 
      state.gameState === 'leaderboard' ||
      state.gameState === 'champion' ||
      state._isFaceOffScreenActive ||
      state.isRandomRollShowoff ||
      state.previewFighter === fighter
    )) ||
    fighter.isDemoFighter ||
    fighter._isFaceOff
  );
  const isCountdownOrPreview = isBackSlungPose;

  const isBankaiChanneling = !isFrozen && Boolean(fighter.isChannelingBankai && fighter.bankaiChargeTimer > 0);
  const isBankaiBursting = !isFrozen && Boolean(fighter.bankaiBurstTimer && fighter.bankaiBurstTimer > 0);
  const isShikaiReverting = !isFrozen && Boolean(fighter.shikaiReversionBurstTimer && fighter.shikaiReversionBurstTimer > 0);
  const auraOpacity = isBankai ? 0.85 : (isMask ? 0.65 : 0.25);

  let bankaiProg = 0;
  if (isBankaiChanneling) {
    const maxB = fighter.bankaiChargeMax || CONFIG.ichigo?.bankaiChargeFrames || 66;
    bankaiProg = Math.min(1.0, Math.max(0.0, 1.0 - ((fighter.bankaiChargeTimer || 0) / maxB)));
  }

  // ── 1.5. Bankai Channeling Vortex & Skyward Eruption Blast Pillar (World-Aligned: Always from Above/Skyward) ──
  if (isBankaiChanneling) {
    _drawBankaiTransformationVortex(ctx, r, bankaiProg, now, fighter);
  } else if (isBankaiBursting) {
    _drawBankaiEruptionBurst(ctx, r, fighter, now);
  } else if (isShikaiReverting) {
    _drawShikaiReversionBurst(ctx, r, fighter, now);
  }

  const formationTimer = fighter.hollowMaskFormationTimer !== undefined ? fighter.hollowMaskFormationTimer : 0;
  const formationMax = fighter.hollowMaskFormationMax || CONFIG.ichigo?.hollowMaskFormationFrames || 300;
  const isForming = isMask && formationTimer > 0;
  const formationProg = isForming ? Math.min(1.0, Math.max(0.0, 1.0 - (formationTimer / formationMax))) : 1.0;

  // ── 1.6. Hollow Mask Transformation Skyward Eruption Blast Pillar (White-Black Line Theme — triggers only after formation completes) ──
  const isHollowBursting = !isFrozen && isMask && (fighter.hollowBurstTimer && fighter.hollowBurstTimer > 0);
  if (isHollowBursting) {
    _drawHollowEruptionBurst(ctx, r, fighter, now, 0);
  }

  // ── 1.8. Bankai & Hollow Mask 3D Ribbon Lifecycle Alpha ──
  // Ribbons show up during Bankai or Hollow Mask formation, then smoothly disappear
  // Strictly hidden during Champion Screen / Winner Reveal and Weapon Menu
  const isChampionScreen = Boolean(fighter._isWinnerReveal || (typeof state !== 'undefined' && state.gameState === 'champion'));
  const isWeaponMenu = Boolean(
    isCountdownOrPreview ||
    (typeof state !== 'undefined' && (
      state.gameState === 'weapons' || 
      state.gameState === 'weaponDetail' || 
      state.gameState === 'weaponStudio' || 
      state.gameState === 'weaponIndex' || 
      state.gameState === 'select' ||
      state.gameState === 'index' ||
      state.gameState === 'indexDetail' ||
      state.previewFighter === fighter
    ))
  );
  let ribbonAlpha = 0;
  if (!isFrozen && !isChampionScreen && !isWeaponMenu) {
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

  // ── 1.85. Hollow Mask Formation Channeling Visual Effect (Reiatsu Floor Pool, Inward Void Suction, Rising Embers) ──
  if (isForming && !isFrozen) {
    _drawHollowChannelingReiatsuAura(ctx, r, formationProg, now, fighter);
  }

  // ── 1.9. Live Spiritual Pressure Aura: Back Layer (Volumetric Plasma Shroud & Floor Pool) ──
  if (!isLowQuality && !isCountdownOrPreview && !isWeaponMenu && (isBankai || isMask || (fighter.combatAuraOpacity && fighter.combatAuraOpacity > 0.05)) && !isFrozen && !isBankaiChanneling && !isForming) {
    _drawBankaiLiveAura(ctx, r, isBankai, isMask, now, 'back');
  }

  const isBankaiStance = isBackSlungPose && isBankai;

  ctx.save();
  // ── 2. Facing / Upright Body Setup (Rule #19 Front Profile POV) ──
  const isHollowChanneling = Boolean(isForming || (fighter.hollowMaskFormationTimer && fighter.hollowMaskFormationTimer > 0));
  const rawAngle = (fighter._isWinnerReveal || isHollowChanneling || isBackSlungPose || isBankaiStance) ? 0 : (fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0));
  const facingLeft = Math.abs(rawAngle) > Math.PI / 2;

  ctx.rotate(rawAngle);
  if (facingLeft && !isHollowChanneling) {
    ctx.scale(1, -1);
  }

  if (!isLowQuality && !isWeaponMenu && ribbonAlpha > 0.01) {
    _drawIchigoFloatingReiatsuAura(ctx, r, isBankai, isMask, isFrozen, now, 'back', ribbonAlpha, isForming, formationProg);
  }

  const isBankaiForm = Boolean(fighter.bankaiActive || fighter.skin === 'bankai' || fighter.skin === 'bankai_mask');
  const isShikai = !isBankaiForm;
  const skinColor = '#FFE0BD';

  const hideHandsAndWeapon = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  const hideFrontHand = hideHandsAndWeapon || fighter.hideFrontHand; // Keep main sword hand firmly gripping katana
  const hideBackHand = hideHandsAndWeapon || fighter.hideBackHand || isForming; // Back/other hand is animated reaching to face

  const isFrozenEntity = Boolean(
    fighter.isFrozenByInfinity ||
    (fighter.timeStopTimer && fighter.timeStopTimer > 0) ||
    (fighter.statusEffects && fighter.statusEffects.timeStopTimer > 0) ||
    (fighter.paralyzeTimer && fighter.paralyzeTimer > 0) ||
    fighter.isParalyzed ||
    fighter.isTargetOfAmbush
  );

  const isChanneling = !isShikaiReverting && Boolean(fighter.isChannelingGetsuga && fighter.getsugaChargeTimer > 0);
  let chargeProg = 0;
  if (isChanneling) {
    const chargeMax = fighter.getsugaChargeMax || CONFIG.ichigo?.getsugaChargeFrames || 50;
    chargeProg = Math.min(1.0, Math.max(0.0, 1.0 - ((fighter.getsugaChargeTimer || 0) / chargeMax)));
  }

  const isSlashing = !isShikaiReverting && Boolean(fighter.slashSwingTimer > 0);
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
    // As chargeProg increases (0 -> 1), sword lifts upward from idle (-0.16 rad) high into the sky overhead (-1.85 rad / ~ -106°)
    const liftEase = Math.min(1.0, chargeProg * 1.7);
    const smoothLift = liftEase * liftEase * (3 - 2 * liftEase);
    const chargeTremble = Math.sin(Date.now() * 0.045) * 0.03 * (0.3 + 0.7 * chargeProg);

    swingAngle = -0.16 + (-1.85 - (-0.16)) * smoothLift + chargeTremble;
    thrustDistance = -4.0 - 6.0 * smoothLift; // Pulls back close to shoulder/head
    bodyShiftX = -1.5 - 3.0 * smoothLift;     // Body coils back into powerful overhead stance
    bodyTilt = -0.04 - 0.08 * smoothLift + chargeTremble * 0.4;
  } else if (isSlashing) {
    const maxT = fighter.slashSwingMaxTimer || 22;
    rawSlashProg = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.slashSwingTimer / maxT)));

    if (fighter.isGetsugaSlash) {
      // Powerful instantaneous downward vertical cleave starting directly from the high lifted sword overhead pose (-1.85 rad) down to (+1.25 rad)
      const slashPhase = 0.20; // Snappy, instantaneous down-chop (~4-5 frames)
      if (rawSlashProg < slashPhase) {
        const p = rawSlashProg / slashPhase;
        const sweepCurve = p * p * (3 - 2 * p); // smooth cubic down-chop
        swingAngle = -1.85 + (1.25 - (-1.85)) * sweepCurve;
        thrustDistance = -10 + 26 * Math.sin(p * Math.PI * 0.5); // -10px to +16px
        bodyShiftX = -4.5 + 9.5 * Math.sin(p * Math.PI * 0.5);  // lunges forward
        bodyTilt = -0.12 + 0.20 * Math.sin(p * Math.PI * 0.5);
      } else {
        // Recovery phase: +1.25 rad eases smoothly back to idle -0.16 rad
        const p = (rawSlashProg - slashPhase) / (1.0 - slashPhase);
        const easeP = 0.5 + 0.5 * Math.cos(p * Math.PI);
        swingAngle = -0.16 + (1.25 - (-0.16)) * easeP;
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

    // Sword rotation and extension based on slash state, combat stance, and overhead lift
    ctx.save();
    ctx.translate(thrustDistance + bodyShiftX, 0);
    ctx.rotate(swingAngle);
    if (isBankaiStance) {
      ctx.scale(1, -1); // Orients razor cutting edge facing forward/outward and 3 fins on inner spine
    }

    if (isShikai) {
      // ── Shikai Zangetsu (Accurate Silver Blade + Black Spine + Trailing Ribbons) ──
      const swordStartX = (isSlashing || !isBackSlungPose) ? (r * 0.68) : (-r * 0.72);
      const swordImg = _getShikaiSwordImage();

      ctx.save();
      ctx.translate(swordStartX, 0);
      ctx.scale(0.90, 0.90);

      const handleLen = 32;
      const handleThick = 6.0;
      const hiltX = -handleLen;
      const tipX = 120, tipY = -10;
      const cutoutR = 5.5;
      const cutoutCenterX = cutoutR, cutoutCenterY = 3.0;
      const heelX = cutoutR * 2, heelY = 18;

      // 1. Draw Trailing White Cloth Ribbons from the Pommel (Dynamic 2-Pass White Cloth Ribbons)
      // Hidden during fights, shown in weapon menus/previews
      if (isWeaponMenu) {
        if (fighter.ribbonStrands && fighter.ribbonStrands.length === 3) {
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);

          const pommel = getZangetsuPommelWorldPos(fighter);
          const swordAngle = (fighter.gunAngle || 0) + swingAngle;
          const spd = Math.hypot(fighter.vx || 0, fighter.vy || 0);
          let perpX = (spd > 0.3) ? -(fighter.vy || 0) / spd : -Math.sin(swordAngle);
          let perpY = (spd > 0.3) ? (fighter.vx || 0) / spd : Math.cos(swordAngle);

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

          const drawOrder = [2, 1, 0];

          for (let idx = 0; idx < 3; idx++) {
            const s = drawOrder[idx];
            const cfg = _ZANGETSU_STRAND_CONFIGS[s];
            const strand = fighter.ribbonStrands[s];
            if (!strand || strand.length < 2) continue;

            _drawPixelRibbonStrand(ctx, strand, cfg, 2.0);
          }

          // Stepped Pixel Knot at Pommel Wrap
          const kx = Math.round(pommel.x / 2.0) * 2.0;
          const ky = Math.round(pommel.y / 2.0) * 2.0;
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(kx - 4.0, ky - 4.0, 8.0, 8.0);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(kx - 2.0, ky - 2.0, 4.0, 4.0);

          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = '#cbd5e1';
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(hiltX - 1, 1);
          ctx.lineTo(hiltX - 12, 10);
          ctx.lineTo(hiltX - 14, 24);
          ctx.lineTo(hiltX - 2, 27);
          ctx.lineTo(hiltX + 10, 30);
          ctx.lineTo(hiltX + 22, 22);
          ctx.lineTo(hiltX + 38, 20);
          ctx.lineTo(hiltX + 36, 17);
          ctx.lineTo(hiltX + 22, 19);
          ctx.lineTo(hiltX + 10, 26);
          ctx.lineTo(hiltX - 2, 24);
          ctx.lineTo(hiltX - 10, 22);
          ctx.lineTo(hiltX - 8, 9);
          ctx.lineTo(hiltX - 1, 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.moveTo(hiltX - 1, 1);
          ctx.lineTo(hiltX - 8, 6);
          ctx.lineTo(hiltX - 8, 18);
          ctx.lineTo(hiltX + 2, 20);
          ctx.lineTo(hiltX + 15, 22);
          ctx.lineTo(hiltX + 28, 16);
          ctx.lineTo(hiltX + 46, 23);
          ctx.lineTo(hiltX + 44, 20);
          ctx.lineTo(hiltX + 28, 13);
          ctx.lineTo(hiltX + 15, 19);
          ctx.lineTo(hiltX + 2, 17);
          ctx.lineTo(hiltX - 5, 15);
          ctx.lineTo(hiltX - 5, 5);
          ctx.lineTo(hiltX, 2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.moveTo(hiltX - 1, 1);
          ctx.lineTo(hiltX - 10, 8);
          ctx.lineTo(hiltX - 11, 22);
          ctx.lineTo(hiltX - 1, 24);
          ctx.lineTo(hiltX + 10, 26);
          ctx.lineTo(hiltX + 22, 12);
          ctx.lineTo(hiltX + 38, 13);
          ctx.lineTo(hiltX + 54, 13);
          ctx.lineTo(hiltX + 52, 10);
          ctx.lineTo(hiltX + 36, 10);
          ctx.lineTo(hiltX + 22, 9);
          ctx.lineTo(hiltX + 10, 22);
          ctx.lineTo(hiltX - 1, 21);
          ctx.lineTo(hiltX - 8, 19);
          ctx.lineTo(hiltX - 7, 7);
          ctx.lineTo(hiltX, 1);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(hiltX - 3.0, -3.5, 4.0, 7.0);
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.0;
          ctx.strokeRect(hiltX - 3.0, -3.5, 4.0, 7.0);

          ctx.restore();
        }
      }

      // 2. Rigid Pixel Art Blade & Handle
      const swordBladeImg = _getShikaiSwordBladeImage();
      if (swordBladeImg && swordBladeImg.complete && swordBladeImg.naturalWidth > 0) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const s = 0.1825;
        ctx.scale(s, s);
        ctx.drawImage(swordBladeImg, -280, -60);
        ctx.restore();
      } else {
        // Fallback procedural
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hiltX, -handleThick / 2, handleLen, handleThick);

        ctx.fillStyle = '#94a3b8';
        for (let px = hiltX + 3.0; px < 0; px += 5.0) {
          ctx.fillRect(px, -handleThick / 2, 1.8, 1.8);
          ctx.fillRect(px + 1.2, -0.5, 1.8, 1.2);
          ctx.fillRect(px, handleThick / 2 - 1.8, 1.8, 1.8);
        }

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(hiltX, -handleThick / 2, handleLen, handleThick);

        // Black Back Spine Region
        ctx.fillStyle = '#101216';
        ctx.beginPath();
        ctx.moveTo(0, -3.0);
        ctx.lineTo(tipX, tipY);
        ctx.quadraticCurveTo(60, -2, heelX, cutoutCenterY);
        ctx.arc(cutoutCenterX, cutoutCenterY, cutoutR, 0, Math.PI, true);
        ctx.lineTo(0, 5.0);
        ctx.lineTo(0, -3.0);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#2d3342';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(0, -2.2);
        ctx.lineTo(tipX, tipY);
        ctx.stroke();

        // Silver Steel Blade Body
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(heelX, heelY);
        ctx.quadraticCurveTo(65, 15, tipX, tipY);
        ctx.quadraticCurveTo(60, -2, heelX, cutoutCenterY);
        ctx.lineTo(heelX, heelY);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(heelX, cutoutCenterY + 1.2);
        ctx.quadraticCurveTo(60, -0.5, tipX, tipY);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(heelX, heelY);
        ctx.quadraticCurveTo(65, 15, tipX, tipY);
        ctx.stroke();

        ctx.strokeStyle = '#0f172a';
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

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.moveTo(heelX, cutoutCenterY);
        ctx.quadraticCurveTo(60, -2, tipX, tipY);
        ctx.stroke();
      }

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
        } else if (isChampionScreen && !hideFrontHand && !isMask) {
          // Front hand resting on lower-left of body circle during champion screen (only when mask is off)
          _drawIchigoHand(ctx, -r * 0.55, r * 0.45, skinColor, true);
        }
      }

      // E) Getsuga Tensho / Bankai Gathering Reiatsu Charging Aura
      if (isChanneling && !isFrozen) {
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
      } else if (isBankaiChanneling && !isFrozen) {
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
        isChampionScreen: isBankaiStance
      });

      // Live Kuroi Reiatsu aura emitting along the Bankai sword (during active combat only — strictly hidden during champion screen, weapon menu, character select)
      const isBattlePlaying = (typeof state !== 'undefined' && state.gameState === 'playing');
      const shouldHideSwordAura = !isBattlePlaying || isShikaiReverting || Boolean(
        fighter.isWeaponMenu ||
        fighter.hideSwordAura ||
        (typeof state !== 'undefined' && (
          state.gameState === 'weapons' ||
          state.gameState === 'weaponDetail' ||
          state.gameState === 'weaponStudio' ||
          state.gameState === 'select' ||
          state.gameState === 'index' ||
          state.gameState === 'indexDetail' ||
          state.previewFighter === fighter
        ))
      );
      if ((!isBackSlungPose || isBankaiStance) && !hideHandsAndWeapon && !isLowQuality && !isChampionScreen && !shouldHideSwordAura && !isFrozen && !isShikaiReverting) {
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
      if (isChanneling && !isFrozen) {
        _drawGetsugaChargingAura(ctx, {
          isShikai: false,
          isBankai: true,
          isMask: isMask,
          chargeProg: chargeProg,
          fighter: fighter,
          swordStartX: swordStartX,
          swordLen: swordLen
        });
      } else if (isBankaiChanneling && !isFrozen) {
        _drawBankaiChargingAura(ctx, swordStartX + swordLen, 0, swordStartX, 0, 0, 0, 0, bankaiProg);
      }
    }

    ctx.restore(); // end sword translate/rotate
  };

  // Render sword BEHIND body during champion screen / preview stance (except Bankai stance which renders in front)
  if (isBackSlungPose && !isBankaiStance) {
    renderZangetsu();
  }

  // ── 4. Main Body Circle (Procedural Pixel Art for Shikai and Bankai) ──
  ctx.save();
  if (bodyShiftX !== 0) {
    ctx.translate(bodyShiftX, 0);
  }

  drawIchigoPixelBody(ctx, r, isShikai, facingLeft);

  ctx.restore(); // end main body circle

  // ── 5. Outer Body Stroke, Edge Glow & Unclipped Hollow Mask Overlay ──
  ctx.save();
  if (bodyShiftX !== 0) {
    ctx.translate(bodyShiftX, 0);
  }

  if (isBankaiChanneling) {
    _drawBankaiBodyEdgeGlow(ctx, r, bankaiProg, now);
  }

  // ── 5.2. Fully Assembled Hollow Mask Overlay (CLIPPED strictly into character body circle) ──
  if (isMask && !isForming) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();

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
      // Fully assembled Hollow Mask PNG (clipped into body circle)
      ctx.drawImage(maskImg, 266, 143, 492, 747, destX, destY, destW, destH);
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

    ctx.restore();
  }

  // ── 5.5. Hollow Mask Formation Animation (Attached pieces clipped to body, flying shards and hand unclipped) ──
  if (isMask && isForming) {
    const maskImg = _getHollowMaskImage();
    const destW = r * 2.15;
    const destH = r * 2.50;
    const destX = -destW / 2;
    const destY = -r * 1.08;

    // 1) Attached pieces clipped strictly to circular body
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.clip();
    _drawHollowMaskFormationAttached(ctx, r, formationProg, now, fighter, maskImg, destX, destY, destW, destH);
    ctx.restore();

    // 2) Flying shards, snap flashes, and clutching hand in unclipped space
    _drawHollowMaskFormationFlying(ctx, r, formationProg, now, fighter, maskImg, destX, destY, destW, destH);
  }

  ctx.restore();

  // Render sword ON TOP of body circle during active fight or Bankai champion stance
  if (!isBackSlungPose || isBankaiStance) {
    renderZangetsu();
  }

  // ── 6. Foreground Floating Reiatsu Flame Aura (Wafting in front of robes, chest, and face) ──
  if (!isLowQuality && !isWeaponMenu && ribbonAlpha > 0.01) {
    _drawIchigoFloatingReiatsuAura(ctx, r, isBankai, isMask, isFrozen, now, 'front', ribbonAlpha, isForming, formationProg);
  }

  ctx.restore(); // end local body rotation

  // ── 6.5. Live Spiritual Pressure Aura: Front Layer (Spirit Heart Core & Micro-Lightning Discharges) ──
  if (!isLowQuality && !isCountdownOrPreview && !isWeaponMenu && (isBankai || isMask || (fighter.combatAuraOpacity && fighter.combatAuraOpacity > 0.05)) && !isFrozen && !isBankaiChanneling) {
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
  // Live Bankai aura effect removed per user request
  return;
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

function _drawPixelDiamond(ctx, x, y, size = 4.0, color = '#ff1e38', coreColor = '#ffffff', pSize = 2.0) {
  const gx = Math.round(x / pSize) * pSize;
  const gy = Math.round(y / pSize) * pSize;
  const halfS = Math.max(1, Math.round(size / pSize)) * pSize;

  // Outer black pixel frame
  ctx.fillStyle = '#08080c';
  ctx.fillRect(gx - halfS - pSize, gy, (halfS + pSize) * 2 + pSize, pSize);
  ctx.fillRect(gx, gy - halfS - pSize, pSize, (halfS + pSize) * 2 + pSize);

  // Colored cross
  ctx.fillStyle = color;
  ctx.fillRect(gx - halfS, gy, halfS * 2 + pSize, pSize);
  ctx.fillRect(gx, gy - halfS, pSize, halfS * 2 + pSize);

  // White core center block
  ctx.fillStyle = coreColor;
  ctx.fillRect(gx, gy, pSize, pSize);
}

function _drawPixelLightning(ctx, x0, y0, x1, y1, color = '#00f0ff', coreColor = '#ffffff', pSize = 2.0) {
  const gx0 = Math.round(x0 / pSize) * pSize;
  const gy0 = Math.round(y0 / pSize) * pSize;
  const gx1 = Math.round(x1 / pSize) * pSize;
  const gy1 = Math.round(y1 / pSize) * pSize;

  const dx = gx1 - gx0;
  const dy = gy1 - gy0;
  const midX = gx0 + Math.round((dx * 0.5) / pSize) * pSize;
  const midY = gy0 + Math.round((dy * 0.5 + 4.0) / pSize) * pSize;

  const drawPixelLine = (ax, ay, bx, by) => {
    const dist = Math.hypot(bx - ax, by - ay);
    const steps = Math.max(1, Math.ceil(dist / pSize));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = Math.round((ax + (bx - ax) * t) / pSize) * pSize;
      const py = Math.round((ay + (by - ay) * t) / pSize) * pSize;
      ctx.fillStyle = '#08080c';
      ctx.fillRect(px - pSize, py, pSize * 3, pSize);
      ctx.fillRect(px, py - pSize, pSize, pSize * 3);
      ctx.fillStyle = color;
      ctx.fillRect(px, py, pSize, pSize);
    }
  };

  drawPixelLine(gx0, gy0, midX, midY);
  drawPixelLine(midX, midY, gx1, gy1);
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

  if (chargeProg <= 0.01) return;

  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const time = now * 0.001;
  const pulse = 1.0 + 0.12 * Math.sin(time * 16.0 + chargeProg * 6.0);
  const alpha = Math.min(1.0, 0.45 + 0.55 * chargeProg) * pulse;

  const isFinal = Boolean(fighter && (fighter.isFinalMassiveGetsuga || fighter._isFinalGetsugaCharging));
  const isBankaiHollow = isMask && isBankai;
  const isShikaiHollow = isMask && !isBankai;

  ctx.save();

  // ── Color Palettes ──
  let primaryColor, secondaryColor, coreColor, outerCoronaColor;
  if (isFinal || isBankaiHollow) {
    primaryColor = `rgba(255, 30, 20, ${(0.92 * alpha).toFixed(3)})`;
    secondaryColor = `rgba(180, 10, 15, ${(0.65 * alpha).toFixed(3)})`;
    coreColor = `rgba(255, 255, 255, ${(1.0 * alpha).toFixed(3)})`;
    outerCoronaColor = `rgba(255, 30, 20, ${(0.25 * alpha).toFixed(3)})`;
  } else if (isBankai) {
    // Kuroi Getsuga: Crimson/Scarlet with white-hot core and dark void contrast
    primaryColor = `rgba(255, 30, 55, ${(0.92 * alpha).toFixed(3)})`;
    secondaryColor = `rgba(200, 15, 35, ${(0.65 * alpha).toFixed(3)})`;
    coreColor = `rgba(255, 245, 245, ${(1.0 * alpha).toFixed(3)})`;
    outerCoronaColor = `rgba(255, 25, 50, ${(0.25 * alpha).toFixed(3)})`;
  } else if (isShikaiHollow) {
    primaryColor = `rgba(0, 240, 255, ${(0.92 * alpha).toFixed(3)})`;
    secondaryColor = `rgba(0, 170, 255, ${(0.65 * alpha).toFixed(3)})`;
    coreColor = `rgba(255, 255, 255, ${(1.0 * alpha).toFixed(3)})`;
    outerCoronaColor = `rgba(0, 240, 255, ${(0.25 * alpha).toFixed(3)})`;
  } else {
    // Standard Shikai Getsuga Tensho (Radiant Azure Blue)
    primaryColor = `rgba(0, 215, 255, ${(0.92 * alpha).toFixed(3)})`;
    secondaryColor = `rgba(0, 140, 255, ${(0.65 * alpha).toFixed(3)})`;
    coreColor = `rgba(255, 255, 255, ${(1.0 * alpha).toFixed(3)})`;
    outerCoronaColor = `rgba(0, 215, 255, ${(0.25 * alpha).toFixed(3)})`;
  }

  if (isShikai) {
    // ═════════════════════════════════════════════════════════════════════
    // ── SHIKAI GETSUGA TENSHO CHARGING AURA ──
    // ═════════════════════════════════════════════════════════════════════

    // 1. Outer Diffuse Reiatsu Corona
    const expandOuter = (4.0 + 8.0 * chargeProg) * pulse;
    ctx.beginPath();
    ctx.moveTo(-expandOuter * 0.5, -3.0 - expandOuter);
    ctx.lineTo(tipX + expandOuter * 1.2, tipY - expandOuter * 0.8);
    ctx.quadraticCurveTo(65 + expandOuter, 15 + expandOuter, heelX - expandOuter * 0.3, heelY + expandOuter);
    ctx.quadraticCurveTo(cutoutCenterX - expandOuter, cutoutCenterY, -expandOuter * 0.5, 5.0 + expandOuter * 0.5);
    ctx.closePath();
    ctx.fillStyle = outerCoronaColor;
    ctx.fill();

    // 2. Mid Vivid Reiatsu Shroud
    const expandMid = (2.0 + 4.5 * chargeProg) * pulse;
    ctx.beginPath();
    ctx.moveTo(-expandMid * 0.5, -3.0 - expandMid);
    ctx.lineTo(tipX + expandMid, tipY - expandMid * 0.6);
    ctx.quadraticCurveTo(65 + expandMid * 0.8, 15 + expandMid * 0.8, heelX, heelY + expandMid * 0.8);
    ctx.quadraticCurveTo(cutoutCenterX, cutoutCenterY, -expandMid * 0.5, 5.0);
    ctx.closePath();
    ctx.fillStyle = secondaryColor;
    ctx.fill();

    // 3. Crisp Inner Luminous Contour Lines along spine and cutting edge
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = Math.max(1.4, 2.8 * chargeProg * pulse);
    ctx.beginPath();
    ctx.moveTo(0, -3.0);
    ctx.lineTo(tipX, tipY);
    ctx.quadraticCurveTo(65, 15, heelX, heelY);
    ctx.stroke();

    // 4. White-Hot Core Blade Edge Shimmer
    ctx.strokeStyle = coreColor;
    ctx.lineWidth = Math.max(0.8, 1.4 * chargeProg);
    ctx.beginPath();
    ctx.moveTo(10, -2.5);
    ctx.lineTo(tipX, tipY);
    ctx.quadraticCurveTo(65, 15, heelX + 4, heelY - 2);
    ctx.stroke();

  } else {
    // ═════════════════════════════════════════════════════════════════════
    // ── BANKAI GETSUGA TENSHO (KUROI GETSUGA) CHARGING AURA ──
    // ═════════════════════════════════════════════════════════════════════
    const startX = swordStartX;
    const len = swordLen || 94;
    const bladeBaseX = startX + 5;
    const actualBladeLen = len - 8;
    const getSori = (x) => {
      const t = Math.max(0, Math.min(1.0, (x - bladeBaseX) / (actualBladeLen || 1)));
      return -Math.pow(t, 1.45) * 8.5;
    };

    // 1. Outer Crimson Reiatsu Corona
    const expandOuter = (3.5 + 7.0 * chargeProg) * pulse;
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const bx = bladeBaseX + t * actualBladeLen;
      const by = getSori(bx) - 2.8 - expandOuter;
      if (i === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    for (let i = 16; i >= 0; i--) {
      const t = i / 16;
      const bx = bladeBaseX + t * actualBladeLen;
      const by = getSori(bx) + 4.5 + expandOuter;
      ctx.lineTo(bx, by);
    }
    ctx.closePath();
    ctx.fillStyle = outerCoronaColor;
    ctx.fill();

    // 2. Mid Vivid Kuroi Shroud
    const expandMid = (1.8 + 3.5 * chargeProg) * pulse;
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const bx = bladeBaseX + t * actualBladeLen;
      const by = getSori(bx) - 2.8 - expandMid;
      if (i === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    for (let i = 16; i >= 0; i--) {
      const t = i / 16;
      const bx = bladeBaseX + t * actualBladeLen;
      const by = getSori(bx) + 4.5 + expandMid;
      ctx.lineTo(bx, by);
    }
    ctx.closePath();
    ctx.fillStyle = secondaryColor;
    ctx.fill();

    // 3. Crisp Crimson Luminous Contour Line along katana edge & spine
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = Math.max(1.2, 2.5 * chargeProg * pulse);
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const bx = bladeBaseX + t * actualBladeLen;
      const by = getSori(bx) + 4.5;
      if (i === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.stroke();

    // 4. White-Hot Core Shimmer on cutting edge
    ctx.strokeStyle = coreColor;
    ctx.lineWidth = Math.max(0.7, 1.2 * chargeProg);
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const bx = bladeBaseX + t * actualBladeLen;
      const by = getSori(bx) + 4.0;
      if (i === 0) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function _drawBankaiChargingAura(ctx, tipX, tipY, heelX, heelY, cutoutCenterX, cutoutCenterY, cutoutR, bankaiProg) {
  if (bankaiProg <= 0.01) return;
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const time = now * 0.001;
  const pulse = 1.0 + 0.15 * Math.sin(time * 24.0);
  const alpha = Math.min(1.0, 0.5 + 0.5 * bankaiProg) * pulse;

  ctx.save();

  // Full-blade crimson corona envelope
  const expand = (3.0 + 6.0 * bankaiProg) * pulse;
  ctx.beginPath();
  ctx.moveTo(-expand * 0.5, -3.0 - expand);
  ctx.lineTo(tipX + expand, tipY - expand * 0.8);
  ctx.quadraticCurveTo(65 + expand, 15 + expand, heelX, heelY + expand);
  ctx.quadraticCurveTo(cutoutCenterX, cutoutCenterY, -expand * 0.5, 5.0);
  ctx.closePath();
  ctx.fillStyle = `rgba(220, 20, 30, ${(0.35 * alpha).toFixed(3)})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 30, 40, ${(0.85 * alpha).toFixed(3)})`;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Rising Crimson Flames along the spine
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const bx = t * tipX;
    const by = -3.0 + t * (tipY + 3.0);
    const fProg = ((time * 4.0 + i * 0.3) % 1.0);
    const fH = (4.0 + 8.0 * bankaiProg) * (1.0 - fProg * 0.35);
    const fA = Math.sin(fProg * Math.PI) * alpha;

    if (fA > 0.02) {
      ctx.fillStyle = `rgba(255, 40, 50, ${(0.90 * fA).toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(bx - 2.5, by);
      ctx.lineTo(bx, by - fH);
      ctx.lineTo(bx + 2.5, by);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${(1.0 * fA).toFixed(3)})`;
      ctx.fillRect(bx - 0.75, by - fH * 0.4, 1.5, 1.5);
    }
  }

  ctx.restore();
}

function _drawBankaiTransformationVortex(ctx, r, bankaiProg, now, fighter) {
  ctx.save();
  const msPerFrame = 1000 / 30;
  const qTime = Math.floor(now / msPerFrame) * msPerFrame;
  const time = qTime * 0.001;
  const pSize = 2.5;

  const ringCount = 4;
  for (let rc = 0; rc < ringCount; rc++) {
    const ringProg = ((time * 1.5 + rc * (1.0 / ringCount)) % 1.0);
    const ringDist = r * (0.6 + (1.0 - ringProg) * 2.2);
    const segs = 16;

    for (let seg = 0; seg < segs; seg++) {
      if ((seg + rc) % 2 === 0) continue;
      const segAngle = (seg / segs) * Math.PI * 2 + time * 6.0;
      const rx = Math.cos(segAngle) * ringDist;
      const ry = Math.sin(segAngle) * ringDist;

      const gx = Math.round(rx / pSize) * pSize;
      const gy = Math.round(ry / pSize) * pSize;

      ctx.fillStyle = '#08080c';
      ctx.fillRect(gx - pSize, gy - pSize, pSize * 3, pSize * 3);

      ctx.fillStyle = (rc % 2 === 0) ? '#ff1e20' : '#dc143c';
      ctx.fillRect(gx, gy, pSize, pSize);
    }
  }

  const sparkCount = 8;
  for (let s = 0; s < sparkCount; s++) {
    const spProg = ((time * 2.0 + s * (1.0 / sparkCount)) % 1.0);
    const spDist = r * (0.5 + (1.0 - spProg) * 2.4);
    const spAngle = s * (Math.PI * 2 / sparkCount) + time * 4.5;
    const sx = Math.cos(spAngle) * spDist;
    const sy = Math.sin(spAngle) * spDist;

    _drawPixelDiamond(ctx, sx, sy, 3.5, (s % 2 === 0) ? '#ff2030' : '#ffffff', '#ffffff', pSize);
  }

  ctx.restore();
}

function _drawBankaiSkywardSonicPillar(ctx, r, burstProg, alpha, now) {
  // Timing: Surges violently upward into the sky upon Bankai Awakening
  const pillarProg = Math.min(1.0, burstProg / 0.70);
  const pillarHeight = 140 + Math.pow(pillarProg, 0.55) * 800; // Skyward beam reaching high into the air
  const pillarBaseW = (44 + 20 * (1.0 - burstProg));
  const pillarAlpha = Math.pow(1.0 - burstProg, 0.9) * alpha;

  if (pillarAlpha <= 0.01) return;

  ctx.save();

  // ── 1. Colossal Outer Reiatsu Corona Shroud (Multi-Peak Needle Silhouette: Jet Black & Crimson Red) ──
  const coronaW = pillarBaseW * 1.55;
  const coronaGrad = ctx.createLinearGradient(-coronaW, 0, coronaW, 0);
  coronaGrad.addColorStop(0.0, 'rgba(220, 20, 20, 0.0)');
  coronaGrad.addColorStop(0.20, `rgba(220, 20, 20, ${(0.85 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.42, `rgba(12, 4, 10, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.50, `rgba(255, 240, 240, ${(1.0 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.58, `rgba(12, 4, 10, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.80, `rgba(220, 20, 20, ${(0.85 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(1.0, 'rgba(220, 20, 20, 0.0)');

  // Outer Multi-Peak Needle Polygon
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

  // ── 2. High-Density Black Void & Stark Ruby-White Core Column ──
  const coreW = pillarBaseW * 0.75;
  const coreGrad = ctx.createLinearGradient(-coreW, 0, coreW, 0);
  coreGrad.addColorStop(0.0, 'rgba(12, 4, 10, 0.0)');
  coreGrad.addColorStop(0.20, `rgba(12, 4, 10, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.40, `rgba(255, 30, 20, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.50, `rgba(255, 255, 255, ${(1.0 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.60, `rgba(255, 30, 20, ${(0.95 * pillarAlpha).toFixed(3)})`);
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

  // ── 3. Vertical Supersonic Speed Needle Streaks Inside Pillar (Black-Crimson Lines) ──
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
    if (s % 4 === 0) sColor = `rgba(12, 4, 10, ${(0.95 * pillarAlpha).toFixed(3)})`;       // Manga dark ink line
    else if (s % 4 === 1) sColor = `rgba(220, 20, 20, ${(0.95 * pillarAlpha).toFixed(3)})`; // Crimson Reiatsu
    else if (s % 4 === 2) sColor = `rgba(255, 45, 20, ${(0.95 * pillarAlpha).toFixed(3)})`; // Fiery red
    else sColor = `rgba(255, 245, 240, ${(0.98 * pillarAlpha).toFixed(3)})`;                 // Ruby-white core

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

      // Outer Crimson Vapor Ring
      ctx.strokeStyle = `rgba(220, 20, 20, ${(0.72 * ringA).toFixed(3)})`;
      ctx.lineWidth = rd.thick * (1.0 - burstProg * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Sharp Jet-Black Void Shock Edge
      ctx.strokeStyle = `rgba(12, 4, 10, ${(0.95 * ringA).toFixed(3)})`;
      ctx.lineWidth = 2.4 * (1.0 - burstProg * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Stark Ruby-White Condensation Vapor Core
      ctx.strokeStyle = `rgba(255, 240, 240, ${(0.98 * ringA).toFixed(3)})`;
      ctx.lineWidth = 1.2 * (1.0 - burstProg * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  // ── 5. Vertical Ascending Micro-Lightning Tendrils (Black-Crimson Theme) ──
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
    ctx.strokeStyle = `rgba(12, 4, 10, ${(0.95 * pillarAlpha).toFixed(3)})`;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.strokeStyle = (b % 2 === 0) ? `rgba(255, 30, 20, ${(0.98 * pillarAlpha).toFixed(3)})` : `rgba(255, 245, 240, ${(0.98 * pillarAlpha).toFixed(3)})`;
    ctx.lineWidth = 1.2;
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

  _drawBankaiSkywardSonicPillar(ctx, r, burstProg, alpha, now);

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
        _drawPixelDiamond(ctx, 0, 0, shard.size || 6.0, shard.color || '#ff1e38', '#ffffff', 2.0);
        ctx.restore();
      }
    }
  }

  ctx.restore();
}

function _drawShikaiSkywardSonicPillar(ctx, r, burstProg, alpha, now) {
  // Timing: Surges violently upward into the sky upon reverting from Bankai back to Shikai
  const pillarProg = Math.min(1.0, burstProg / 0.70);
  const pillarHeight = 140 + Math.pow(pillarProg, 0.55) * 800; // Skyward beam reaching high into the air
  const pillarBaseW = (44 + 20 * (1.0 - burstProg));
  const pillarAlpha = Math.pow(1.0 - burstProg, 0.9) * alpha;

  if (pillarAlpha <= 0.01) return;

  ctx.save();

  // ── 1. Colossal Outer Shikai Reiatsu Corona Shroud (Multi-Peak Needle Silhouette: Cyan-Blue, Pure White & Jet Black) ──
  const coronaW = pillarBaseW * 1.55;
  const coronaGrad = ctx.createLinearGradient(-coronaW, 0, coronaW, 0);
  coronaGrad.addColorStop(0.0, 'rgba(0, 213, 255, 0.0)');
  coronaGrad.addColorStop(0.20, `rgba(0, 213, 255, ${(0.85 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.42, `rgba(10, 15, 24, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.50, `rgba(255, 255, 255, ${(1.0 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.58, `rgba(10, 15, 24, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(0.80, `rgba(0, 213, 255, ${(0.85 * pillarAlpha).toFixed(3)})`);
  coronaGrad.addColorStop(1.0, 'rgba(0, 213, 255, 0.0)');

  // Outer Multi-Peak Needle Polygon (Cyan-Blue, White, Black lines)
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

  // ── 2. High-Density Black Void & Stark Cyan-White Core Column ──
  const coreW = pillarBaseW * 0.75;
  const coreGrad = ctx.createLinearGradient(-coreW, 0, coreW, 0);
  coreGrad.addColorStop(0.0, 'rgba(10, 15, 24, 0.0)');
  coreGrad.addColorStop(0.20, `rgba(10, 15, 24, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.40, `rgba(0, 213, 255, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.50, `rgba(255, 255, 255, ${(1.0 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.60, `rgba(0, 213, 255, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(0.80, `rgba(10, 15, 24, ${(0.95 * pillarAlpha).toFixed(3)})`);
  coreGrad.addColorStop(1.0, 'rgba(10, 15, 24, 0.0)');

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

  // ── 3. Vertical Supersonic Speed Needle Streaks Inside Pillar (CyanBlue-White-Black Lines) ──
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
    if (s % 4 === 0) sColor = `rgba(10, 15, 24, ${(0.95 * pillarAlpha).toFixed(3)})`;       // Manga dark ink line
    else if (s % 4 === 1) sColor = `rgba(0, 213, 255, ${(0.95 * pillarAlpha).toFixed(3)})`; // Sky-Blue Reiatsu
    else if (s % 4 === 2) sColor = `rgba(0, 170, 255, ${(0.95 * pillarAlpha).toFixed(3)})`; // Deep Electric Cyan
    else sColor = `rgba(255, 255, 255, ${(0.98 * pillarAlpha).toFixed(3)})`;                 // Pure White Core

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

      // Outer Cyan-Blue Vapor Ring
      ctx.strokeStyle = `rgba(0, 213, 255, ${(0.75 * ringA).toFixed(3)})`;
      ctx.lineWidth = rd.thick * (1.0 - burstProg * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Sharp Jet-Black Void Shock Edge
      ctx.strokeStyle = `rgba(10, 15, 24, ${(0.95 * ringA).toFixed(3)})`;
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

  // ── 5. Vertical Ascending Micro-Lightning Tendrils (Cyan-White Theme) ──
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
    ctx.strokeStyle = `rgba(10, 15, 24, ${(0.95 * pillarAlpha).toFixed(3)})`;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.strokeStyle = (b % 2 === 0) ? `rgba(0, 213, 255, ${(0.98 * pillarAlpha).toFixed(3)})` : `rgba(255, 255, 255, ${(0.98 * pillarAlpha).toFixed(3)})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.restore();
}

function _drawShikaiReversionBurst(ctx, r, fighter, now) {
  const maxB = fighter.shikaiReversionBurstMax || CONFIG.ichigo?.shikaiReversionBurstFrames || 36;
  const curB = fighter.shikaiReversionBurstTimer || 0;
  const burstProg = Math.min(1.0, Math.max(0.0, 1.0 - (curB / maxB)));
  const alpha = Math.pow(1.0 - burstProg, 0.85);

  if (alpha <= 0.01) return;

  ctx.save();
  _drawShikaiSkywardSonicPillar(ctx, r, burstProg, alpha, now);
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

function _drawHollowChannelingReiatsuAura(ctx, r, formationProg, now, fighter) {
  ctx.save();
  const time = now * 0.003;
  const pSize = 2.0;

  // 1. Ground Ghost-White Ethereal Spiritual Pool under feet
  const poolR = r * (1.50 + 0.20 * Math.sin(time * 6.0));
  const poolGrad = ctx.createRadialGradient(0, 0, r * 0.35, 0, 0, poolR);
  poolGrad.addColorStop(0.0, 'rgba(248, 248, 255, 0.60)');  // Bright Ghost White core
  poolGrad.addColorStop(0.35, 'rgba(220, 232, 250, 0.45)'); // Spectral Silver Mist
  poolGrad.addColorStop(0.75, 'rgba(20, 24, 35, 0.70)');   // Deep Phantom Shadow
  poolGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = poolGrad;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.35, poolR * 1.25, poolR * 0.70, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Inward Ghost-White Suction / Gravity Distortion Shock Rings (Condensing spiritual pressure inward toward face)
  const ringCount = 3;
  for (let i = 0; i < ringCount; i++) {
    const ringPhase = ((time * 1.6 + i * (1.0 / ringCount)) % 1.0);
    // Inward contracting radius
    const ringR = r * (3.4 - ringPhase * 2.4);
    const ringAlpha = Math.sin(ringPhase * Math.PI) * 0.65 * (0.6 + 0.4 * formationProg);
    
    ctx.strokeStyle = (i % 2 === 0) 
      ? `rgba(248, 248, 255, ${ringAlpha.toFixed(2)})` 
      : `rgba(200, 218, 240, ${(ringAlpha * 0.9).toFixed(2)})`;
    ctx.lineWidth = 2.2 * (1.0 - ringPhase * 0.4);
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. Rising Ghost-White Flame Wisps, Spectral Embers & Hollow Mask Shard Motes
  const emberCount = 12;
  for (let e = 0; e < emberCount; e++) {
    const eSeed = e * 37.1 + time * 2.5;
    const eProg = ((time * 1.8 + e * (1.0 / emberCount)) % 1.0);
    const eAng = e * (Math.PI * 2 / emberCount) + Math.sin(eSeed) * 0.5;
    const eDist = r * (0.65 + 0.85 * (1.0 - eProg * 0.45));
    const ex = Math.cos(eAng) * eDist;
    const ey = Math.sin(eAng) * eDist - eProg * 38; // Rises upward toward mask
    const eAlpha = Math.sin(eProg * Math.PI) * 0.90;

    if (eAlpha > 0.05) {
      const eColor = (e % 3 === 0) 
        ? `rgba(255, 255, 255, ${eAlpha.toFixed(2)})` 
        : ((e % 3 === 1) 
          ? `rgba(248, 248, 255, ${eAlpha.toFixed(2)})` 
          : `rgba(215, 230, 250, ${eAlpha.toFixed(2)})`);
      _drawPixelDiamond(
        ctx, 
        ex, 
        ey, 
        3.5 * (1.0 - eProg * 0.4), 
        eColor, 
        '#FFFFFF', 
        pSize
      );
    }
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

  _drawHollowSkywardSonicPillar(ctx, r, burstProg, alpha, now);

  if (fighter.hollowShards && fighter.hollowShards.length > 0) {
    for (let s = 0; s < fighter.hollowShards.length; s++) {
      const shard = fighter.hollowShards[s];
      const relX = shard.x - fighter.x;
      const relY = shard.y - fighter.y;
      const shardAlpha = (shard.life || 1.0) * alpha;

      if (shardAlpha > 0.02) {
        ctx.save();
        ctx.translate(relX, relY);
        ctx.rotate(shard.rot || 0);
        _drawPixelDiamond(ctx, 0, 0, shard.size || 6.0, shard.color || '#ffffff', '#ffffff', 2.0);
        ctx.restore();
      }
    }
  }

  ctx.restore();
}

function _drawBankaiActiveFlameWisps(ctx, r, now) {
  ctx.save();
  const msPerFrame = 1000 / 30;
  const qTime = Math.floor(now / msPerFrame) * msPerFrame;
  const time = qTime * 0.001;
  const pSize = 2.0;

  const wispCount = 6;
  for (let w = 0; w < wispCount; w++) {
    const wProg = ((time * 2.0 + w * (1.0 / wispCount)) % 1.0);
    const wAng = (w / wispCount) * Math.PI * 2;
    const wDist = r * (0.85 + 0.40 * wProg);
    const wx = Math.cos(wAng) * wDist;
    const wy = Math.sin(wAng) * wDist - wProg * 22;

    _drawPixelDiamond(ctx, wx, wy, 3.5, (w % 2 === 0) ? '#ff2838' : '#dc143c', '#ffffff', pSize);
  }

  ctx.restore();
}

/**
 * Draws Ichigo's entire body circle model in authentic Pixel Art Style.
 * Uses discrete stepped pixel grid rasterization matching Saitama (Rule #19 compliant).
 * Minimalist circle brawler aesthetic, upright front POV, faceless.
 */
function drawIchigoPixelBody(ctx, r, isShikai = false, facingLeft = false) {
  ctx.save();
  ctx.imageSmoothingEnabled = false; // Nearest-neighbor scaling for authentic pixel art
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  // Discrete Spiky Forehead Bangs calculation (7 iconic anime spikes)
  function getHairlineY(rx) {
    const nx = rx / r; // -1 to +1
    const spikeWave = Math.abs(Math.sin(nx * Math.PI * 3.5));
    const centralLength = (1.0 - Math.abs(nx) * 0.35);
    const spikeExtension = r * 0.30 * centralLength * Math.pow(spikeWave, 1.15);
    return -r * 0.36 + spikeExtension;
  }

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);

      // Pixelated Black Stroke Border
      if (Math.hypot(rx + P, ry) > r || Math.hypot(rx - P, ry) > r || Math.hypot(rx, ry + P) > r || Math.hypot(rx, ry - P) > r) {
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      const hairlineY = getHairlineY(rx);

      // ──────────────────────────────────────────
      // ZONE 1: Spiky Orange Hair (ry < hairlineY)
      // ──────────────────────────────────────────
      if (ry < hairlineY) {
        let col = '#FF7700'; // Base vibrant anime orange
        if (ry < -r * 0.70) {
          col = '#FFA534'; // Crown highlight
        } else if (ry < -r * 0.50 && Math.abs(rx) < r * 0.45) {
          col = '#FF8C1A'; // Mid hair shine
        } else if (ry > hairlineY - P * 2.2) {
          col = '#D95500'; // Bang tip shadow
        } else if (Math.abs(rx) > r * 0.75) {
          col = '#E66000'; // Side fringe shadow
        }
        ctx.fillStyle = col;
        ctx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: Warm Peach Face Skin (hairlineY <= ry < r * 0.10)
      // ──────────────────────────────────────────
      else if (ry < r * 0.10) {
        let col = '#FFE0BD'; // Base warm peach
        if (ry < hairlineY + P * 2.0) {
          col = '#F2C8A4'; // Forehead hair shadow
        } else if (Math.abs(rx) > r * 0.72 || ry > r * 0.05) {
          col = '#F0C29E'; // Cheek / chin shadow
        }
        ctx.fillStyle = col;
        ctx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: SHIHAKUSHO ROBES (ry >= r * 0.10)
      // ──────────────────────────────────────────
      else if (isShikai) {
        // ── SHIKAI ROBE LOGIC ──
        const strapSign = facingLeft ? -1 : 1;

        // A. Diagonal Red Ribbon / Chain Strap
        const strapStartX = -r * 0.38 * strapSign;
        const strapEndX   =  r * 0.28 * strapSign;
        const strapProg = (ry - r * 0.10) / (r * 0.44);
        const strapCenterX = strapStartX + (strapEndX - strapStartX) * strapProg;
        const isStrap = (ry >= r * 0.10 && ry <= r * 0.54 && Math.abs(rx - strapCenterX) <= r * 0.075);

        // B. White Inner Collar V-Neck
        const collarHalfW = (1 - (ry - r * 0.10) / (r * 0.32)) * (r * 0.28);
        const isInsideCollarV = (ry <= r * 0.42 && Math.abs(rx) <= Math.max(0, collarHalfW));
        const isCollarWhiteTrim = (ry <= r * 0.44 && Math.abs(Math.abs(rx) - collarHalfW) <= P * 1.5);

        // C. White Obi Belt & Buckle
        const isObiBelt = (ry >= r * 0.52 && ry <= r * 0.68 && Math.abs(rx) <= r * 0.78);
        const isObiKnot = (ry >= r * 0.50 && ry <= r * 0.72 && Math.abs(rx) <= r * 0.10);
        // D. Hanging Sash Tails
        const isSashTail = (ry >= r * 0.68 && ry <= r * 0.96 && Math.abs(rx) <= (r * 0.08 + (ry - r * 0.68) * 0.18));

        if (isObiKnot) {
          ctx.fillStyle = (Math.abs(rx) < P && Math.abs(ry - r * 0.60) < P) ? '#FFFFFF' : '#E0E6EE';
        } else if (isSashTail) {
          if (Math.abs(rx) < P * 0.8) {
            ctx.fillStyle = '#C8D0DC'; // Split shadow
          } else {
            ctx.fillStyle = (ry > r * 0.90) ? '#D8DEE8' : '#FFFFFF';
          }
        } else if (isObiBelt) {
          if (ry < r * 0.55) {
            ctx.fillStyle = '#FFFFFF'; // Top highlight
          } else if (ry > r * 0.64) {
            ctx.fillStyle = '#CBD2DE'; // Bottom shadow
          } else {
            ctx.fillStyle = '#E8EDF4'; // Main obi
          }
        } else if (isStrap) {
          // Crimson ribbon with golden rivet studs
          if (Math.abs(rx - strapCenterX) > r * 0.055) {
            ctx.fillStyle = '#7A0C10';
          } else if (Math.abs(ry - r * 0.22) < P || Math.abs(ry - r * 0.38) < P) {
            ctx.fillStyle = '#FFD700'; // Gold stud
          } else {
            ctx.fillStyle = (rx - strapCenterX < 0) ? '#FF2A40' : '#CC1025';
          }
        } else if (isCollarWhiteTrim || isInsideCollarV) {
          if (isInsideCollarV && ry < r * 0.36 && Math.abs(rx) < collarHalfW - P * 1.5) {
            ctx.fillStyle = '#F5D2B8'; // Inner chest skin V
          } else {
            ctx.fillStyle = (ry < r * 0.25) ? '#FFFFFF' : '#DDE3ED';
          }
        } else {
          // Black Shihakusho robe
          let col = '#15161B';
          if (Math.abs(rx) > r * 0.72 || ry > r * 0.84) {
            col = '#0C0D10';
          } else if (ry < r * 0.25 && Math.abs(rx) < r * 0.50) {
            col = '#22242C';
          }
          ctx.fillStyle = col;
        }
        ctx.fillRect(px, py, P, P);
      } else {
        // ── BANKAI ROBE LOGIC ──
        // Deep Double V-Neck Trenchcoat Collar + Split Coat
        const outerVHalfW = (1 - (ry - r * 0.10) / (r * 0.40)) * (r * 0.36);
        const innerVHalfW = (1 - (ry - r * 0.14) / (r * 0.34)) * (r * 0.26);

        const isOuterVWhite = (ry >= r * 0.10 && ry <= r * 0.50 && Math.abs(Math.abs(rx) - outerVHalfW) <= P * 1.2);
        const isInnerVWhite = (ry >= r * 0.14 && ry <= r * 0.48 && Math.abs(Math.abs(rx) - innerVHalfW) <= P * 1.2);
        const isBetweenVBlack = (ry >= r * 0.12 && ry <= r * 0.46 && Math.abs(rx) < outerVHalfW && Math.abs(rx) > innerVHalfW);
        const isChestSkinV = (ry >= r * 0.14 && ry <= r * 0.46 && Math.abs(rx) < innerVHalfW);

        // Lower Split Obi Coat (ry >= r * 0.62)
        const splitCoatWidth = (ry - r * 0.62) * 0.84;
        const isCoatSplitWhite = (ry >= r * 0.62 && Math.abs(rx) <= splitCoatWidth);
        const isCenterCoatSlit = (ry >= r * 0.68 && Math.abs(rx) <= r * 0.05);

        if (isChestSkinV) {
          ctx.fillStyle = (ry < r * 0.24) ? '#FFE0BD' : '#F0C29E'; // Exposed chest skin
        } else if (isOuterVWhite || isInnerVWhite) {
          ctx.fillStyle = (ry < r * 0.28) ? '#FFFFFF' : '#D5DDE8'; // Double white V trim
        } else if (isBetweenVBlack) {
          ctx.fillStyle = '#111216'; // Black fold between double V
        } else if (isCenterCoatSlit) {
          ctx.fillStyle = '#0B0C0E'; // Dark center coat slit
        } else if (isCoatSplitWhite) {
          if (Math.abs(rx) > splitCoatWidth - P * 1.5) {
            ctx.fillStyle = '#FFFFFF'; // White split coat piping edge
          } else {
            ctx.fillStyle = (ry > r * 0.88) ? '#CBD3E0' : '#E0E7F2'; // White undercoat lining
          }
        } else {
          // Bankai Jet-Black Trenchcoat
          let col = '#111216';
          if (ry < r * 0.28 && Math.abs(rx) < r * 0.55) {
            col = '#1E2028'; // Shoulder fabric sheen
          } else if (Math.abs(rx) > r * 0.72 || ry > r * 0.85) {
            col = '#0A0A0D'; // Deep outer fold shadow
          }
          ctx.fillStyle = col;
        }
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}

function _drawIchigoHand(ctx, hx, hy, skinColor, isShikai) {
  const handR = getHandSize ? getHandSize(6.5) : 6.5;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  ctx.save();
  ctx.translate(hx, hy);

  // Shihakusho black wrist sleeve cuff in pixel art
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(snap(-handR - 4 - P), snap(-handR * 0.9 - P), snap(5.5 + P * 2), snap(handR * 1.8 + P * 2));
  ctx.fillStyle = '#111111';
  ctx.fillRect(snap(-handR - 4), snap(-handR * 0.9), snap(5.5), snap(handR * 1.8));

  // White cloth bandages on wrist for Shikai in pixel art
  if (isShikai) {
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(snap(-handR - 3), snap(-handR * 0.6), P, snap(handR * 1.2));
    ctx.fillRect(snap(-handR - 1), snap(-handR * 0.6), P, snap(handR * 1.2));
  }

  // Clenched fist / hand base in authentic pixel art
  drawPixelHand(ctx, 0, 0, handR, skinColor || '#FFE0BD');

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
    const maxB = fighter.bankaiChargeMax || CONFIG.ichigo?.bankaiChargeFrames || 66;
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
    const chargeTremble = Math.sin(Date.now() * 0.045) * 0.03 * (0.3 + 0.7 * chargeProg);

    swingAngle = -0.16 + (-1.85 - (-0.16)) * smoothLift + chargeTremble;
    thrustDistance = -4.0 - 6.0 * smoothLift;
    bodyShiftX = -1.5 - 3.0 * smoothLift;
    bodyTilt = -0.04 - 0.08 * smoothLift + chargeTremble * 0.4;
  } else if (isSlashing) {
    if (fighter.isGetsugaSlash) {
      const slashPhase = 0.20;
      if (rawSlashProg < slashPhase) {
        const p = rawSlashProg / slashPhase;
        const sweepCurve = p * p * (3 - 2 * p);
        swingAngle = -1.85 + (1.25 - (-1.85)) * sweepCurve;
        thrustDistance = -10 + 26 * Math.sin(p * Math.PI * 0.5);
        bodyShiftX = -4.5 + 9.5 * Math.sin(p * Math.PI * 0.5);
        bodyTilt = -0.12 + 0.20 * Math.sin(p * Math.PI * 0.5);
      } else {
        const p = (rawSlashProg - slashPhase) / (1.0 - slashPhase);
        const easeP = 0.5 + 0.5 * Math.cos(p * Math.PI);
        swingAngle = -0.16 + (1.25 - (-0.16)) * easeP;
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
  const theta = swingAngle;
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

function _drawPixelRibbonStrand(ctx, strand, cfg, pSize = 2.0) {
  if (!strand || strand.length < 2) return;
  const outlineMap = new Map();
  const fillMap = new Map();

  const widthBlocks = Math.max(1, Math.round(cfg.width / pSize));
  const halfW = widthBlocks / 2.0;

  for (let s = 0; s < strand.length - 1; s++) {
    const x0 = strand[s].x, y0 = strand[s].y;
    const x1 = strand[s + 1].x, y1 = strand[s + 1].y;
    const dx = x1 - x0, dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(dist / (pSize * 0.5)));
    const ux = dx / Math.max(1e-4, dist);
    const uy = dy / Math.max(1e-4, dist);
    const nx = -uy;
    const ny = ux;

    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const cx = x0 + dx * t;
      const cy = y0 + dy * t;
      const gx = Math.round(cx / pSize) * pSize;
      const gy = Math.round(cy / pSize) * pSize;

      for (let w = -Math.ceil(halfW) - 1; w <= Math.ceil(halfW) + 1; w++) {
        const bx = Math.round((gx + nx * w * pSize) / pSize) * pSize;
        const by = Math.round((gy + ny * w * pSize) / pSize) * pSize;
        const key = `${bx}_${by}`;

        if (Math.abs(w) <= halfW) {
          fillMap.set(key, [bx, by]);
        } else {
          outlineMap.set(key, [bx, by]);
        }
      }
    }
  }

  // Pass 1: Crisp outer black pixel outline blocks
  ctx.fillStyle = '#0f172a';
  for (const [key, pos] of outlineMap) {
    if (!fillMap.has(key)) {
      ctx.fillRect(pos[0], pos[1], pSize, pSize);
    }
  }

  // Pass 2: Inner core color pixel blocks
  ctx.fillStyle = cfg.color;
  for (const [key, pos] of fillMap) {
    ctx.fillRect(pos[0], pos[1], pSize, pSize);
  }
}

const _ZANGETSU_STRAND_CONFIGS = [
  {
    // Strand 0: Longest primary flowing sash
    nodes: 14,
    linkDist: 5.5,
    damping: 0.94,
    gravity: 0.12,
    flutterSpeed: 0.003,
    flutterAmp: 0.8,
    flutterPhase: 0.0,
    lateralDrift: 0.8,
    width: 4.0,
    color: '#ffffff',
    rootOffset: 0.0
  },
  {
    // Strand 1: Medium secondary ribbon
    nodes: 10,
    linkDist: 4.8,
    damping: 0.93,
    gravity: 0.10,
    flutterSpeed: 0.004,
    flutterAmp: 0.6,
    flutterPhase: 2.1,
    lateralDrift: -0.8,
    width: 3.0,
    color: '#e2e8f0',
    rootOffset: 2.0
  },
  {
    // Strand 2: Shorter loose wrap tail
    nodes: 7,
    linkDist: 4.2,
    damping: 0.92,
    gravity: 0.14,
    flutterSpeed: 0.005,
    flutterAmp: 0.5,
    flutterPhase: 4.5,
    lateralDrift: 0.8,
    width: 2.2,
    color: '#cbd5e1',
    rootOffset: -2.0
  }
];

export function updateZangetsuRibbonPhysics(fighter) {
  if (!fighter) return;

  // Skip Shikai ribbon physics when in Bankai form or during fights (ribbons not visible during fight)
  if (fighter.bankaiActive || fighter.skin === 'bankai') return;

  const isWeaponMenu = Boolean(
    fighter.isWeaponMenu ||
    fighter._isFaceOff ||
    (typeof state !== 'undefined' && (
      state.gameState === 'weapons' || 
      state.gameState === 'weaponDetail' || 
      state.gameState === 'weaponStudio' || 
      state.gameState === 'weaponIndex' || 
      state.gameState === 'select' ||
      state.gameState === 'index' ||
      state.gameState === 'indexDetail' ||
      state.previewFighter === fighter
    ))
  );
  if (!isWeaponMenu) return;

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
    startDir: { x: 0.0, y: -1.25 },
    rot: -0.22,
    delay: 0.00
  },
  // 1. Top Left Temple Horn Spike
  {
    name: 'horn_left',
    poly: [[0.00, 0.00], [0.34, 0.00], [0.40, 0.24], [0.08, 0.26]],
    startDir: { x: -0.95, y: -0.75 },
    rot: 0.32,
    delay: 0.07
  },
  // 2. Top Right Temple Horn Spike (Crimson Stripes)
  {
    name: 'horn_right',
    poly: [[0.66, 0.00], [1.00, 0.00], [0.92, 0.26], [0.60, 0.24]],
    startDir: { x: 0.95, y: -0.75 },
    rot: -0.32,
    delay: 0.14
  },
  // 3. Left Brow & Upper Eye Socket
  {
    name: 'brow_left',
    poly: [[0.08, 0.26], [0.50, 0.24], [0.50, 0.39], [0.10, 0.41]],
    startDir: { x: -1.15, y: -0.35 },
    rot: 0.26,
    delay: 0.21
  },
  // 4. Right Brow & Upper Eye Socket (Crimson Stripes)
  {
    name: 'brow_right',
    poly: [[0.50, 0.24], [0.92, 0.26], [0.90, 0.41], [0.50, 0.39]],
    startDir: { x: 1.15, y: -0.35 },
    rot: -0.26,
    delay: 0.28
  },
  // 5. Left Cheek & Bone-White Plate
  {
    name: 'cheek_left',
    poly: [[0.06, 0.41], [0.44, 0.39], [0.44, 0.59], [0.08, 0.60]],
    startDir: { x: -1.25, y: 0.25 },
    rot: -0.28,
    delay: 0.36
  },
  // 6. Right Cheek & Visored Sunburst Plate
  {
    name: 'cheek_right',
    poly: [[0.56, 0.39], [0.94, 0.41], [0.92, 0.60], [0.56, 0.59]],
    startDir: { x: 1.25, y: 0.25 },
    rot: 0.28,
    delay: 0.44
  },
  // 7. Central Nasal Ridge Bone / Center Divider
  {
    name: 'nose_bridge',
    poly: [[0.44, 0.39], [0.56, 0.39], [0.56, 0.59], [0.44, 0.59]],
    startDir: { x: 0.0, y: -0.85 },
    rot: 0.18,
    delay: 0.52
  },
  // 8. Upper Gritted Teeth Row
  {
    name: 'upper_teeth',
    poly: [[0.14, 0.59], [0.86, 0.59], [0.80, 0.74], [0.20, 0.74]],
    startDir: { x: 0.0, y: 0.95 },
    rot: -0.16,
    delay: 0.60
  },
  // 9. Lower Left Jaw & Teeth
  {
    name: 'jaw_left',
    poly: [[0.16, 0.74], [0.50, 0.74], [0.50, 0.90], [0.26, 0.88]],
    startDir: { x: -0.85, y: 0.85 },
    rot: 0.26,
    delay: 0.68
  },
  // 10. Lower Right Jaw & Teeth (Crimson Marks)
  {
    name: 'jaw_right',
    poly: [[0.50, 0.74], [0.84, 0.74], [0.74, 0.88], [0.50, 0.90]],
    startDir: { x: 0.85, y: 0.85 },
    rot: -0.26,
    delay: 0.74
  },
  // 11. Pointed Chin Tip Vertex
  {
    name: 'chin_tip',
    poly: [[0.26, 0.88], [0.74, 0.88], [0.50, 1.00]],
    startDir: { x: 0.0, y: 1.25 },
    rot: 0.08,
    delay: 0.80
  }
];

function _drawHollowMaskFormationAttached(ctx, r, formationProg, now, fighter, maskImg, destX, destY, destW, destH) {
  if (formationProg < 0.06) return;
  const hasImg = Boolean(maskImg && maskImg.complete && maskImg.naturalWidth > 0);
  const maskAssemblyProg = Math.min(1.0, Math.max(0.0, (formationProg - 0.06) / 0.78));

  for (let i = 0; i < _MASK_FORMATION_SHARDS.length; i++) {
    const shard = _MASK_FORMATION_SHARDS[i];
    if (maskAssemblyProg < shard.delay) continue;

    const rawProg = (maskAssemblyProg - shard.delay) / 0.16;
    if (rawProg < 1.0) continue; // Only draw once it has arrived and attached to the face!

    // Draw high-contrast solid bone-white shard base
    ctx.beginPath();
    shard.poly.forEach((pt, idx) => {
      const px = destX + pt[0] * destW;
      const py = destY + pt[1] * destH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();

    ctx.fillStyle = '#F8F7F2'; // Authentic bone porcelain ivory
    ctx.fill();

    // Clip strictly to polygon boundary for high-res mask texture
    ctx.save();
    ctx.clip();

    if (hasImg) {
      // Draw the authentic Hollow Mask PNG inside this clipped fragment
      ctx.drawImage(maskImg, 266, 143, 492, 747, destX, destY, destW, destH);
    } else {
      // Procedural fallback: Crimson stripes on right-side shards
      if (shard.name.includes('right') || shard.name === 'chin_tip') {
        ctx.strokeStyle = '#DC143C';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.moveTo(destX + destW * 0.45, destY + destH * 0.20);
        ctx.lineTo(destX + destW * 0.85, destY + destH * 0.55);
        ctx.moveTo(destX + destW * 0.55, destY + destH * 0.15);
        ctx.lineTo(destX + destW * 0.92, destY + destH * 0.45);
        ctx.stroke();
      }
      if (shard.name === 'upper_teeth' || shard.name.includes('jaw')) {
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let tx = destX + destW * 0.25; tx < destX + destW * 0.75; tx += 4.5) {
          ctx.moveTo(tx, destY + destH * 0.60);
          ctx.lineTo(tx, destY + destH * 0.85);
        }
        ctx.stroke();
      }
    }
    ctx.restore();

    // Crisp dark ink seam outline around the attached shard polygon
    ctx.strokeStyle = (formationProg < 0.84) ? '#1A1A1A' : 'rgba(20, 20, 20, 0.65)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    shard.poly.forEach((pt, idx) => {
      const px = destX + pt[0] * destW;
      const py = destY + pt[1] * destH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.stroke();
  }
}

function _drawHollowMaskFormationFlying(ctx, r, formationProg, now, fighter, maskImg, destX, destY, destW, destH) {
  const easeOutBack = (t) => {
    const c1 = 1.45;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  const hasImg = Boolean(maskImg && maskImg.complete && maskImg.naturalWidth > 0);

  // 1. Render shards that are in-flight converging towards the face + arrival snap flashes
  if (formationProg >= 0.06) {
    const maskAssemblyProg = Math.min(1.0, Math.max(0.0, (formationProg - 0.06) / 0.78));

    for (let i = 0; i < _MASK_FORMATION_SHARDS.length; i++) {
      const shard = _MASK_FORMATION_SHARDS[i];
      if (maskAssemblyProg < shard.delay) continue;

      const rawProg = (maskAssemblyProg - shard.delay) / 0.16;

      // Centroid
      let cx = 0, cy = 0;
      for (const pt of shard.poly) {
        cx += destX + pt[0] * destW;
        cy += destY + pt[1] * destH;
      }
      cx /= shard.poly.length;
      cy /= shard.poly.length;

      if (rawProg < 1.0) {
        // In-flight shard!
        const shardProg = Math.max(0, rawProg);
        const ease = easeOutBack(shardProg);
        const remain = Math.max(0, 1.0 - ease);

        const dist = r * 2.2 * remain;
        const curOffX = shard.startDir.x * dist;
        const curOffY = shard.startDir.y * dist;
        const curRot = shard.rot * remain;
        const curScale = 0.65 + 0.35 * Math.min(1.0, ease);
        const curAlpha = Math.min(1.0, 0.40 + shardProg * 0.60);

        ctx.save();
        ctx.globalAlpha = curAlpha;
        ctx.translate(cx + curOffX, cy + curOffY);
        ctx.rotate(curRot);
        ctx.scale(curScale, curScale);
        ctx.translate(-cx, -cy);

        // Solid bone base
        ctx.beginPath();
        shard.poly.forEach((pt, idx) => {
          const px = destX + pt[0] * destW;
          const py = destY + pt[1] * destH;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fillStyle = '#F8F7F2';
        ctx.fill();

        ctx.save();
        ctx.clip();
        if (hasImg) {
          ctx.drawImage(maskImg, 266, 143, 492, 747, destX, destY, destW, destH);
        } else {
          if (shard.name.includes('right') || shard.name === 'chin_tip') {
            ctx.strokeStyle = '#DC143C';
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.moveTo(destX + destW * 0.45, destY + destH * 0.20);
            ctx.lineTo(destX + destW * 0.85, destY + destH * 0.55);
            ctx.stroke();
          }
        }
        ctx.restore();

        // Glowing white-crimson outline while flying
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.90 * (1.0 - shardProg)).toFixed(2)})`;
        ctx.lineWidth = 2.4;
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 30, 0, ${(0.80 * (1.0 - shardProg)).toFixed(2)})`;
        ctx.lineWidth = 4.0;
        ctx.stroke();

        // Spiritual pressure wisps
        if (Math.random() < 0.35) {
          ctx.strokeStyle = '#FF1E00';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + curOffX * 0.4 + (Math.random() - 0.5) * 8, cy + curOffY * 0.4 + (Math.random() - 0.5) * 8);
          ctx.stroke();
        }

        ctx.restore();
      } else if (rawProg >= 1.0 && rawProg < 1.35) {
        // Instantaneous arrival snap flash
        const snapRatio = (rawProg - 1.0) / 0.35;
        const snapAlpha = Math.sin(snapRatio * Math.PI);
        ctx.save();
        ctx.beginPath();
        shard.poly.forEach((pt, idx) => {
          const px = destX + pt[0] * destW;
          const py = destY + pt[1] * destH;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.strokeStyle = `rgba(255, 255, 255, ${(0.95 * snapAlpha).toFixed(2)})`;
        ctx.lineWidth = 3.0;
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 30, 0, ${(0.85 * snapAlpha).toFixed(2)})`;
        ctx.lineWidth = 5.0;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // 2. Hand-to-Face Clutching Animation (Anime Visored Manifestation Gesture — Left / Other Hand grasps face while Right Hand holds Katana)
  let handX = 0, handY = 0, handRot = 0, handAlpha = 0, handOpen = 0;
  if (formationProg < 0.12) {
    const p = formationProg / 0.12;
    const ease = p * p * (3 - 2 * p);
    handX = (-r * 0.50) * (1.0 - ease) + (-r * 0.36) * ease;
    handY = (r * 0.35) * (1.0 - ease) + (-r * 0.38) * ease;
    handRot = (-0.55) * (1.0 - ease) + (0.28) * ease;
    handAlpha = Math.min(1.0, p * 1.6);
    handOpen = ease;
  } else if (formationProg < 0.84) {
    const p = (formationProg - 0.12) / 0.72;
    const tremble = Math.sin(now * 0.09) * 1.4 * (1.0 - p * 0.25);
    handX = -r * 0.36 + tremble;
    handY = -r * 0.38 + tremble * 0.5;
    handRot = 0.28 + tremble * 0.04;
    handAlpha = 1.0;
    handOpen = 1.0;
  } else {
    const p = (formationProg - 0.84) / 0.16;
    const ease = p * p;
    handX = (-r * 0.36) * (1.0 - ease) + (-r * 0.65) * ease;
    handY = (-r * 0.38) * (1.0 - ease) + (r * 0.40) * ease;
    handRot = (0.28) * (1.0 - ease) + (-0.45) * ease;
    handAlpha = Math.max(0, 1.0 - p * 1.25);
    handOpen = 1.0 - p * 0.4;
  }

  const isBankaiForm = Boolean(fighter.bankaiActive || fighter.skin === 'bankai' || fighter.skin === 'bankai_mask');
  _drawFaceClutchingHand(ctx, r, handX, handY, handRot, handAlpha, handOpen, now, isBankaiForm);

  // 3. Seam snap-lock impact fusion & lightning flash when all pieces converge into complete mask (formationProg >= 0.82)
  if (formationProg >= 0.82) {
    const flashRatio = (formationProg - 0.82) / 0.18;
    const flashAlpha = Math.sin(flashRatio * Math.PI);

    if (flashAlpha > 0.01) {
      ctx.save();
      // Glowing white-hot & crimson fusion seam network
      ctx.strokeStyle = `rgba(255, 255, 255, ${(0.95 * flashAlpha).toFixed(2)})`;
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

      ctx.strokeStyle = `rgba(255, 30, 0, ${(0.85 * flashAlpha).toFixed(2)})`;
      ctx.lineWidth = 4.5;
      ctx.stroke();

      // Radial energy flash burst on center of mask
      const grad = ctx.createRadialGradient(0, -r * 0.25, 0, 0, -r * 0.25, r * 1.35);
      grad.addColorStop(0, `rgba(255, 255, 255, ${(0.90 * flashAlpha).toFixed(2)})`);
      grad.addColorStop(0.35, `rgba(255, 30, 0, ${(0.65 * flashAlpha).toFixed(2)})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -r * 0.25, r * 1.35, 0, Math.PI * 2);
      ctx.fill();

      // Menacing golden hollow eyes ignition flare
      if (formationProg >= 0.84) {
        const eyeAlpha = Math.min(1.0, (formationProg - 0.84) / 0.16);
        ctx.fillStyle = `rgba(255, 215, 0, ${(0.95 * eyeAlpha).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(-r * 0.32, -r * 0.12, 3.4, 0, Math.PI * 2);
        ctx.arc(r * 0.32, -r * 0.12, 3.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 60, 0, ${(0.80 * eyeAlpha).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(-r * 0.32, -r * 0.12, 6.5, 0, Math.PI * 2);
        ctx.arc(r * 0.32, -r * 0.12, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Eye pupils
        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(-r * 0.32, -r * 0.12, 1.2, 0, Math.PI * 2);
        ctx.arc(r * 0.32, -r * 0.12, 1.2, 0, Math.PI * 2);
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

  // 1. Black Shihakusho Sleeve Cuff on Wrist (Extending from lower-left toward torso)
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

  // 2. Palm / Hand Back (Left Hand)
  ctx.fillStyle = skinColor;
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.ellipse(0, 0, handR * 1.15, handR * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 3. Five Detailed Fingers Splayed Across the Face (Anime Left Hand Visored Pose)
  const fingers = [
    { name: 'thumb',  bx:  handR * 0.35, by:  handR * 0.55, angle:  0.85, len: handR * 1.35, thick: 2.5 },
    { name: 'index',  bx:  handR * 0.20, by: -handR * 0.65, angle: -1.15, len: handR * 1.65, thick: 2.4 },
    { name: 'middle', bx: -handR * 0.15, by: -handR * 0.75, angle: -1.55, len: handR * 1.85, thick: 2.5 },
    { name: 'ring',   bx: -handR * 0.50, by: -handR * 0.55, angle: -1.95, len: handR * 1.75, thick: 2.4 },
    { name: 'pinky',  bx: -handR * 0.75, by: -handR * 0.25, angle: -2.35, len: handR * 1.45, thick: 2.2 }
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

    // Ghost white & crimson Reiatsu electric sparks crackling from fingertips during clutch
    if (open > 0.65 && Math.random() < 0.40) {
      ctx.strokeStyle = (i % 2 === 0) ? '#F8F8FF' : '#FF1E00';
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


