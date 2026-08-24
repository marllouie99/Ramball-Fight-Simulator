import { getHandSize, CONFIG } from '../../core/config.js';
import { state } from '../../core/state.js';

export function drawIchigoSkin(ctx, fighter) {
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const now = Date.now();
  const r = fighter.r;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // ── 1. Spiritual Pressure (Reiatsu) Aura ──
  const isBankai = Boolean(fighter.bankaiActive || fighter.skin === 'bankai');
  const isMask = Boolean(fighter.hollowMaskActive);
  const isFrozen = Boolean(
    fighter.isFrozenByInfinity ||
    (fighter.timeStopTimer && fighter.timeStopTimer > 0) ||
    (fighter.statusEffects && fighter.statusEffects.timeStopTimer > 0) ||
    (fighter.paralyzeTimer && fighter.paralyzeTimer > 0) ||
    fighter.isParalyzed ||
    fighter.isTargetOfAmbush
  );

  const isBankaiChanneling = !isFrozen && Boolean(fighter.isChannelingBankai && fighter.bankaiChargeTimer > 0);
  const isBankaiBursting = !isFrozen && Boolean(fighter.bankaiBurstTimer && fighter.bankaiBurstTimer > 0);
  const auraOpacity = isBankai ? 0.85 : (isMask ? 0.65 : 0.25);

  let bankaiProg = 0;
  if (isBankaiChanneling) {
    const maxB = fighter.bankaiChargeMax || CONFIG.ichigo?.bankaiChargeFrames || 50;
    bankaiProg = Math.min(1.0, Math.max(0.0, 1.0 - ((fighter.bankaiChargeTimer || 0) / maxB)));
  }

  if (isBankaiChanneling) {
    _drawBankaiTransformationVortex(ctx, r, bankaiProg, now, fighter);
  } else if (isBankaiBursting) {
    _drawBankaiEruptionBurst(ctx, r, fighter, now);
  } else if (!isLowQuality) {
    const pulse = 1.0 + Math.sin(now * 0.015) * 0.15;
    const grad = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * (isBankai ? 2.6 : (isMask ? 2.0 : 1.6)) * pulse);
    
    if (isBankai && isMask) {
      // Bankai + Hollow Mask: Dense black core with fiery crimson / cyan corona
      grad.addColorStop(0, 'rgba(0, 229, 255, 0.85)');
      grad.addColorStop(0.30, 'rgba(255, 30, 0, 0.75)');
      grad.addColorStop(0.65, 'rgba(10, 5, 10, 0.65)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    } else if (isBankai) {
      // Pure Bankai: Deep black void core + roaring electric cyan & fiery crimson corona
      grad.addColorStop(0, 'rgba(0, 229, 255, 0.90)');
      grad.addColorStop(0.35, 'rgba(220, 20, 20, 0.60)');
      grad.addColorStop(0.70, 'rgba(10, 10, 18, 0.75)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    } else if (isMask) {
      // Hollow Mask: Black & red flame-like aura
      grad.addColorStop(0, 'rgba(255, 30, 0, 0.6)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.5)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    } else {
      // Base Shikai: Soft electric cyan Reiatsu
      grad.addColorStop(0, 'rgba(0, 191, 255, 0.40)');
      grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.20)');
      grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    }
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r * (isBankai ? 2.6 : (isMask ? 2.0 : 1.6)) * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Active Bankai rising spiritual flame wisps
    if (isBankai && !isFrozen) {
      _drawBankaiActiveFlameWisps(ctx, r, now);
    }
  }

  // ── 2. Facing / Rotation Setup ──
  const angle = fighter.gunAngle || 0;
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  const isCountdownOrPreview = (typeof state !== 'undefined' && (
    state.gameState === 'countdown' || 
    state.gameState === 'weaponIndex' || 
    state.gameState === 'characterSelect' || 
    state.gameState === 'indexDetail' || 
    state.gameState === 'matchEnd' || 
    state.gameState === 'roundEnd'
  )) || fighter.isDemoFighter || fighter._isWinnerReveal;

  const isBankaiForm = Boolean(fighter.bankaiActive || fighter.skin === 'bankai');
  const isShikai = !isBankaiForm;
  const skinColor = '#FFE0BD';
  const hideHandsAndWeapon = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  const hideFrontHand = hideHandsAndWeapon || fighter.hideFrontHand;
  const hideBackHand = hideHandsAndWeapon || fighter.hideBackHand;

  const isFrozenEntity = Boolean(
    fighter.isFrozenByInfinity ||
    (fighter.timeStopTimer && fighter.timeStopTimer > 0) ||
    (fighter.statusEffects && fighter.statusEffects.timeStopTimer > 0) ||
    (fighter.paralyzeTimer && fighter.paralyzeTimer > 0) ||
    fighter.isParalyzed ||
    fighter.isTargetOfAmbush
  );

  const isChanneling = !isFrozenEntity && Boolean(fighter.isChannelingGetsuga && fighter.getsugaChargeTimer > 0);
  let chargeProg = 0;
  if (isChanneling) {
    const chargeMax = fighter.getsugaChargeMax || CONFIG.ichigo?.getsugaChargeFrames || 50;
    chargeProg = Math.min(1.0, Math.max(0.0, 1.0 - ((fighter.getsugaChargeTimer || 0) / chargeMax)));
  }

  const isSlashing = !isFrozenEntity && Boolean(fighter.slashSwingTimer > 0);
  let rawSlashProg = 0;
  let swingAngle = -0.16;
  let thrustDistance = 0;
  let bodyShiftX = 0;
  let bodyTilt = 0;

  if (isBankaiChanneling) {
    // 2-Handed Focus Bankai Transformation Charge Pose:
    // Holds sword horizontally / diagonally in front of chest, trembling with intense spiritual pressure
    const bankaiTremble = Math.sin(now * 0.065) * 0.06 * (0.4 + 0.6 * bankaiProg);
    swingAngle = -0.55 + bankaiTremble;
    thrustDistance = -6 - 4 * bankaiProg; // Pulls sword close to body
    bodyShiftX = -3 - 2 * bankaiProg;     // Body hunkers low into grounding stance
    bodyTilt = -0.06 + bankaiTremble * 0.5;
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
      // Powerful downward vertical cleave starting directly from the high lifted sword overhead pose (-2.10 rad) down to (+1.35 rad)
      if (rawSlashProg < 0.50) {
        const p = rawSlashProg / 0.50;
        const sweepCurve = p * p * (3 - 2 * p); // smooth cubic down-chop
        swingAngle = -2.10 + (1.35 - (-2.10)) * sweepCurve;
        thrustDistance = -10 + 26 * Math.sin(p * Math.PI * 0.5); // -10px to +16px
        bodyShiftX = -4.5 + 9.5 * Math.sin(p * Math.PI * 0.5); // lunges forward -4.5px to +5.0px
        bodyTilt = -0.12 + 0.20 * Math.sin(p * Math.PI * 0.5);
      } else {
        // Recovery phase: +1.35 rad eases back to idle -0.16 rad
        const p = (rawSlashProg - 0.50) / 0.50;
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
        bodyTilt = 0.05 * easeP;
      }
    }
  } else if (isCountdownOrPreview) {
    // Countdown / Preview back-slung pose: handle behind head (upper-left), blade tip sweeping down-right
    swingAngle = Math.PI / 4;
    thrustDistance = 0;
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

    if (isShikai) {
      // ── Shikai Zangetsu (Accurate Silver Blade + Black Spine + Trailing Ribbons) ──
      const swordStartX = (isSlashing || !isCountdownOrPreview) ? (r * 0.68) : (-r * 0.68);

      ctx.save();
      ctx.translate(swordStartX, 0);
      ctx.scale(0.85, 0.85);

      const handleLen = 32;
      const handleThick = 6.0;
      const hiltX = -handleLen;

      // 1. Draw Trailing White Cloth Ribbons from the Pommel (Dynamic 2-Pass White Cloth Ribbons)
      if (fighter.ribbonStrands && fighter.ribbonStrands.length === 3) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const strandColors = ['#FFFFFF', '#F5F5F5', '#EAEAEA'];
        const strandWidths = [3.6, 3.0, 2.4];

        const pommel = getZangetsuPommelWorldPos(fighter);

        for (let s = 0; s < 3; s++) {
          const strand = fighter.ribbonStrands[s];
          if (!strand || strand.length < 2) continue;

          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Pass 1: Dark Outer Border
          ctx.beginPath();
          ctx.moveTo(strand[0].x, strand[0].y);
          for (let i = 1; i < strand.length - 1; i++) {
            const xc = (strand[i].x + strand[i + 1].x) / 2;
            const yc = (strand[i].y + strand[i + 1].y) / 2;
            ctx.quadraticCurveTo(strand[i].x, strand[i].y, xc, yc);
          }
          ctx.lineTo(strand[strand.length - 1].x, strand[strand.length - 1].y);
          ctx.strokeStyle = '#111111';
          ctx.lineWidth = strandWidths[s] + 1.8;
          ctx.stroke();

          // Pass 2: White Cloth Ribbon Core
          ctx.beginPath();
          ctx.moveTo(strand[0].x, strand[0].y);
          for (let i = 1; i < strand.length - 1; i++) {
            const xc = (strand[i].x + strand[i + 1].x) / 2;
            const yc = (strand[i].y + strand[i + 1].y) / 2;
            ctx.quadraticCurveTo(strand[i].x, strand[i].y, xc, yc);
          }
          ctx.lineTo(strand[strand.length - 1].x, strand[strand.length - 1].y);
          ctx.strokeStyle = strandColors[s];
          ctx.lineWidth = strandWidths[s];
          ctx.stroke();
        }

        // Fabric Pommel Wrap Knot in World Space
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#111111';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(pommel.x, pommel.y, 3.2, 0, Math.PI * 2);
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

      // D) Hands gripping Shikai handle during active combat
      if (!isCountdownOrPreview && !hideHandsAndWeapon) {
        // Back hand (for 2-handed grip on heavy chop or charging stance)
        if ((isChanneling || isBankaiChanneling || (isSlashing && rawSlashProg >= 0.08 && rawSlashProg <= 0.65)) && !hideBackHand) {
          _drawIchigoHand(ctx, hiltX + 7, 0, skinColor, true);
        }
        // Front hand (main grip near guard)
        if (!hideFrontHand) {
          _drawIchigoHand(ctx, hiltX + 18, 0, skinColor, true);
        }
      }

      // E) Getsuga Tensho / Bankai Gathering Reiatsu Charging Aura
      if (isChanneling) {
        _drawGetsugaChargingAura(ctx, 0, tipX, isMask, false, true, chargeProg);
      } else if (isBankaiChanneling) {
        _drawBankaiChargingAura(ctx, 0, tipX, bankaiProg);
      }

      ctx.restore();
    } else {
      // ── Tensa Zangetsu (Bankai daito) ──
      const swordLen = 54;
      const swordStartX = r * 0.65;
      
      // 1. Guard / Tsuba (Manji / cross shape)
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(swordStartX - 2, -7, 4, 14);
      ctx.fillRect(swordStartX - 7, -2, 14, 4);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(swordStartX - 2, -7, 4, 14);
      ctx.strokeRect(swordStartX - 7, -2, 14, 4);

      // 2. Hilt Handle extending backward behind guard
      ctx.fillStyle = '#1C1C1C';
      ctx.fillRect(swordStartX - 16, -2, 14, 4);
      ctx.strokeStyle = '#050505';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(swordStartX - 16, -2, 14, 4);

      // Criss-cross red diamond wrap details on Bankai hilt
      ctx.strokeStyle = isMask ? '#990000' : '#880000';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (let hx = swordStartX - 14; hx < swordStartX - 2; hx += 3) {
        ctx.moveTo(hx, -2);
        ctx.lineTo(hx + 1.5, 2);
        ctx.moveTo(hx, 2);
        ctx.lineTo(hx + 1.5, -2);
      }
      ctx.stroke();

      // 3. Blade Body (Slender black daito blade)
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.moveTo(swordStartX, -2);
      ctx.lineTo(swordStartX + swordLen - 8, -1.8);
      ctx.lineTo(swordStartX + swordLen, 0); // Tip
      ctx.lineTo(swordStartX + swordLen - 8, 1.8);
      ctx.lineTo(swordStartX, 2);
      ctx.closePath();
      ctx.fill();

      // Sword outline / edge highlight
      ctx.strokeStyle = isMask ? '#FF5500' : '#00E5FF';
      ctx.lineWidth = isMask ? 1.5 : 1.0;
      ctx.stroke();

      // 4. Hilt Pommel Black Chain
      ctx.strokeStyle = isMask ? '#990000' : '#111111';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(swordStartX - 16, 0);
      ctx.bezierCurveTo(swordStartX - 22, -6, swordStartX - 26, 6, swordStartX - 32, -2);
      ctx.stroke();

      // 5. Hands gripping Bankai hilt during active combat
      if (!isCountdownOrPreview && !hideHandsAndWeapon) {
        // Back hand (during 2-handed power chop or charging stance)
        if ((isChanneling || isBankaiChanneling || (isSlashing && rawSlashProg >= 0.08 && rawSlashProg <= 0.65)) && !hideBackHand) {
          _drawIchigoHand(ctx, swordStartX - 14, 0, skinColor, false);
        }
        // Front hand (main grip behind guard)
        if (!hideFrontHand) {
          _drawIchigoHand(ctx, swordStartX - 8, 0, skinColor, false);
        }
      }

      // 6. Getsuga Tensho / Bankai Gathering Reiatsu Charging Aura
      if (isChanneling) {
        _drawGetsugaChargingAura(ctx, swordStartX, swordLen, isMask, true, false, chargeProg);
      } else if (isBankaiChanneling) {
        _drawBankaiChargingAura(ctx, swordStartX, swordLen, bankaiProg);
      }
    }

    ctx.restore(); // end sword translate/rotate
  };

  // Render sword BEHIND body during countdown/preview
  if (isCountdownOrPreview) {
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
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, r * 0.1);
      ctx.lineTo(0, r * 0.42);
      ctx.moveTo(r * 0.25, r * 0.1);
      ctx.lineTo(-r * 0.12, r * 0.49);
      ctx.stroke();

      // Diagonal Red Ribbon/Chain Strap (for holding Zangetsu on his back)
      ctx.save();
      // 1. Dark red shadow backing line
      ctx.strokeStyle = '#700c0f';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, r * 0.1);
      ctx.lineTo(r * 0.25, r * 0.55);
      ctx.stroke();

      // 2. Red core line
      ctx.strokeStyle = '#E31B23';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.35, r * 0.1);
      ctx.lineTo(r * 0.25, r * 0.55);
      ctx.stroke();

      // 3. Small red beads along the strap
      ctx.fillStyle = '#FF4D52';
      for (let t = 0.05; t <= 0.95; t += 0.16) {
        const px = -r * 0.35 * (1 - t) + (r * 0.25) * t;
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

    // ── Hollow Mask Overlay ──
    if (isMask) {
      ctx.fillStyle = '#FFFFFF'; // White mask base on left side of face
      ctx.beginPath();
      ctx.arc(0, 0, r, -Math.PI * 0.9, -Math.PI * 0.1, false);
      ctx.lineTo(0, r);
      ctx.closePath();
      ctx.fill();

      // Red/Black jagged mask lines
      ctx.strokeStyle = '#B00000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Jagged lines stretching across mask
      ctx.moveTo(-r * 0.4, -r * 0.4);
      ctx.lineTo(-r * 0.1, -r * 0.1);
      ctx.moveTo(-r * 0.6, -r * 0.2);
      ctx.lineTo(-r * 0.2, 0);
      ctx.moveTo(-r * 0.5, 0.1);
      ctx.lineTo(-r * 0.1, r * 0.3);
      ctx.stroke();

      // Hollow yellow eye iris details
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.1, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.1, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

  ctx.restore(); // end main body circle clip

  // ── 5. Outer Body Stroke ──
  ctx.save();
  if (bodyShiftX !== 0 || bodyTilt !== 0) {
    ctx.translate(bodyShiftX, 0);
    ctx.rotate(bodyTilt);
  }
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Render sword ON TOP of body circle during active fight
  if (!isCountdownOrPreview) {
    renderZangetsu();
  }

  ctx.restore(); // end translation
}

function _drawGetsugaChargingAura(ctx, startX, len, isMask, isBankai, isShikai, chargeProg) {
  const now = Date.now();
  const pulse = 1.0 + 0.15 * Math.sin(now * 0.025);
  const auraAlpha = (0.55 + 0.45 * chargeProg) * pulse;

  // 1. Blade Spine Reiatsu Glow Layer
  ctx.save();
  const glowH = (isMask ? 11 : 9) * pulse;
  const grad = ctx.createLinearGradient(startX, 0, startX + len, 0);

  if (isMask) {
    grad.addColorStop(0, `rgba(255, 40, 0, ${0.4 * auraAlpha})`);
    grad.addColorStop(0.5, `rgba(255, 120, 0, ${0.85 * auraAlpha})`);
    grad.addColorStop(1, `rgba(255, 240, 180, ${0.95 * auraAlpha})`);
  } else if (isBankai) {
    grad.addColorStop(0, `rgba(0, 150, 255, ${0.4 * auraAlpha})`);
    grad.addColorStop(0.5, `rgba(0, 229, 255, ${0.85 * auraAlpha})`);
    grad.addColorStop(1, `rgba(255, 255, 255, ${0.95 * auraAlpha})`);
  } else {
    grad.addColorStop(0, `rgba(0, 120, 255, ${0.4 * auraAlpha})`);
    grad.addColorStop(0.5, `rgba(0, 200, 255, ${0.85 * auraAlpha})`);
    grad.addColorStop(1, `rgba(255, 255, 255, ${0.95 * auraAlpha})`);
  }

  ctx.fillStyle = grad;
  ctx.fillRect(startX - 2, -glowH * 0.5, len + 6, glowH);

  // 2. Swirling Reiatsu Energy Tendrils gathering toward blade tip
  const tendrilCount = 4;
  for (let t = 0; t < tendrilCount; t++) {
    const phase = (now * 0.008 + t * (Math.PI * 2 / tendrilCount)) % (Math.PI * 2);
    const waveY = Math.sin(phase) * (glowH * 0.9);
    const waveX = startX + (Math.cos(phase * 0.7) * 0.5 + 0.5) * len;

    ctx.beginPath();
    ctx.moveTo(waveX - 12, waveY);
    ctx.quadraticCurveTo(waveX, -waveY * 0.5, startX + len, 0);

    if (isMask) ctx.strokeStyle = `rgba(255, 160, 20, ${0.8 * auraAlpha})`;
    else ctx.strokeStyle = `rgba(180, 240, 255, ${0.85 * auraAlpha})`;

    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // 3. Charging energy sparks flying along blade
  const sparkCount = 3 + Math.floor(chargeProg * 3);
  for (let s = 0; s < sparkCount; s++) {
    const spPhase = (now * 0.012 + s * 1.5) % 1.0;
    const spX = startX + spPhase * len;
    const spY = Math.sin(now * 0.02 + s) * (glowH * 0.6);
    const spR = 1.2 + chargeProg * 1.4;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(spX, spY, spR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function _drawBankaiTransformationVortex(ctx, r, bankaiProg, now, fighter) {
  ctx.save();

  const isCompressing = bankaiProg >= 0.75;
  const compProg = isCompressing ? (bankaiProg - 0.75) / 0.25 : 0.0;
  const easeProg = Math.pow(bankaiProg, 1.2);

  // ── 1. Ground Reiatsu Fissures & Electrical Floor Cracks ──
  const fissureReach = r * (2.4 + bankaiProg * 3.2);
  const crackCount = 14;
  const crackAlpha = Math.min(1.0, bankaiProg * 2.2) * (1.0 - compProg * 0.35);

  // Ground Reiatsu Scorch Base
  const scorchR = r * (1.8 + bankaiProg * 2.5);
  const scorchGrad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, scorchR);
  scorchGrad.addColorStop(0, `rgba(4, 2, 4, ${0.92 * crackAlpha})`);
  scorchGrad.addColorStop(0.50, `rgba(30, 4, 8, ${0.75 * crackAlpha})`);
  scorchGrad.addColorStop(0.85, `rgba(220, 20, 20, ${0.40 * crackAlpha})`);
  scorchGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = scorchGrad;
  ctx.beginPath();
  ctx.arc(0, 0, scorchR, 0, Math.PI * 2);
  ctx.fill();

  // Branching ground fissures radiating outward
  for (let b = 0; b < crackCount; b++) {
    const bAng = b * (Math.PI * 2 / crackCount) + Math.sin(now * 0.008 + b * 1.5) * 0.10;
    const bLen = fissureReach * (0.55 + 0.45 * ((b % 3 === 0) ? 0.98 : 0.76));
    const numSegs = 4;
    
    // Pass A: Outer Crimson Glow
    ctx.beginPath();
    ctx.moveTo(0, 0);
    let curX = 0, curY = 0;
    for (let s = 1; s <= numSegs; s++) {
      const frac = s / numSegs;
      const jag = (s % 2 === 0 ? 1 : -1) * (5.0 + 3.5 * Math.sin(now * 0.035 + b * 2));
      const segDist = bLen * frac;
      curX = Math.cos(bAng) * segDist - Math.sin(bAng) * jag;
      curY = Math.sin(bAng) * segDist + Math.cos(bAng) * jag;
      ctx.lineTo(curX, curY);
    }
    ctx.strokeStyle = (b % 2 === 0) 
      ? `rgba(220, 20, 20, ${0.85 * crackAlpha})` 
      : `rgba(255, 60, 20, ${0.75 * crackAlpha})`;
    ctx.lineWidth = 4.2;
    ctx.stroke();

    // Pass B: Hot White-Amber Core Line
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let s = 1; s <= numSegs; s++) {
      const frac = s / numSegs;
      const jag = (s % 2 === 0 ? 1 : -1) * (5.0 + 3.5 * Math.sin(now * 0.035 + b * 2));
      const segDist = bLen * frac;
      curX = Math.cos(bAng) * segDist - Math.sin(bAng) * jag;
      curY = Math.sin(bAng) * segDist + Math.cos(bAng) * jag;
      ctx.lineTo(curX, curY);
    }
    ctx.strokeStyle = `rgba(255, 255, 240, ${0.95 * crackAlpha})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // ── 2. Inward Gravitational Suction Spiritual Energy Motes ──
  const suctionCount = 18;
  for (let i = 0; i < suctionCount; i++) {
    const suctionSpeed = 0.0022 * (1.2 + bankaiProg * 1.8);
    const suctionP = ((now * suctionSpeed + i * (1.0 / suctionCount)) % 1.0);
    const invP = 1.0 - suctionP; // 1.0 -> 0.0 (rushing into center)
    const startDist = 160 + (i % 5) * 18;
    const curDist = invP * startDist;
    const spiralAngle = i * (Math.PI * 2 / suctionCount) + (now * 0.0025) + invP * 1.4;

    const sx = Math.cos(spiralAngle) * curDist;
    const sy = Math.sin(spiralAngle) * curDist;
    const tailLen = (8 + 14 * bankaiProg) * invP;
    const tx = sx + Math.cos(spiralAngle + 0.35) * tailLen;
    const ty = sy + Math.sin(spiralAngle + 0.35) * tailLen;

    const moteAlpha = Math.sin(suctionP * Math.PI) * Math.min(1.0, bankaiProg * 2.0);
    if (moteAlpha > 0.01) {
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(sx, sy);
      if (i % 3 === 0) {
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.90 * moteAlpha})`;
      } else if (i % 3 === 1) {
        ctx.strokeStyle = `rgba(255, 30, 20, ${0.95 * moteAlpha})`;
      } else {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * moteAlpha})`;
      }
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
  }

  // ── 3. Colossal Towering Skyward Reiatsu Vortex Pillar ──
  const beamTopY = -680;
  const beamBottomY = +25;
  const pillarBaseW = r * 2.9 * (1.0 + 0.18 * Math.sin(now * 0.025));
  const pillarW = pillarBaseW * (isCompressing ? (1.0 - compProg * 0.60) : 1.0);
  const vortexAlpha = Math.min(1.0, bankaiProg * 2.5);

  const numYSteps = 28;
  const leftPts = [];
  const rightPts = [];

  for (let step = 0; step <= numYSteps; step++) {
    const frac = step / numYSteps;
    const y = beamBottomY + (beamTopY - beamBottomY) * frac;
    // Dynamic dual-frequency sine wave contours for raging Reiatsu silhouette
    const wave1 = Math.sin(y * 0.022 - now * 0.035) * (pillarW * 0.22);
    const wave2 = Math.cos(y * 0.012 + now * 0.020) * (pillarW * 0.14);
    const totalWave = wave1 + wave2;

    const currentW = pillarW * (1.0 + 0.15 * Math.sin(frac * Math.PI));
    leftPts.push({ x: -currentW + totalWave, y });
    rightPts.push({ x: currentW + totalWave, y });
  }

  // Pass A: Outer Fiery Crimson & Cyan Corona Band
  ctx.beginPath();
  ctx.moveTo(leftPts[0].x - 6, leftPts[0].y);
  for (let i = 1; i < leftPts.length; i++) ctx.lineTo(leftPts[i].x - 6, leftPts[i].y);
  for (let i = rightPts.length - 1; i >= 0; i--) ctx.lineTo(rightPts[i].x + 6, rightPts[i].y);
  ctx.closePath();

  const coronaGrad = ctx.createLinearGradient(-pillarW * 1.2, 0, pillarW * 1.2, 0);
  coronaGrad.addColorStop(0.0, `rgba(0, 229, 255, ${0.40 * vortexAlpha})`);
  coronaGrad.addColorStop(0.18, `rgba(220, 20, 20, ${0.85 * vortexAlpha})`);
  coronaGrad.addColorStop(0.50, `rgba(255, 60, 20, ${0.75 * vortexAlpha})`);
  coronaGrad.addColorStop(0.82, `rgba(220, 20, 20, ${0.85 * vortexAlpha})`);
  coronaGrad.addColorStop(1.0, `rgba(0, 229, 255, ${0.40 * vortexAlpha})`);
  ctx.fillStyle = coronaGrad;
  ctx.fill();

  // Pass B: Deep Pitch-Black Void Spiritual Pressure Core
  ctx.beginPath();
  ctx.moveTo(leftPts[0].x, leftPts[0].y);
  for (let i = 1; i < leftPts.length; i++) ctx.lineTo(leftPts[i].x, leftPts[i].y);
  for (let i = rightPts.length - 1; i >= 0; i--) ctx.lineTo(rightPts[i].x, rightPts[i].y);
  ctx.closePath();

  const coreGrad = ctx.createLinearGradient(-pillarW, 0, pillarW, 0);
  coreGrad.addColorStop(0.0, `rgba(220, 20, 20, ${0.70 * vortexAlpha})`);
  coreGrad.addColorStop(0.25, `rgba(8, 2, 6, ${0.96 * vortexAlpha})`);
  coreGrad.addColorStop(0.50, `rgba(2, 1, 3, ${0.99 * vortexAlpha})`);
  coreGrad.addColorStop(0.75, `rgba(8, 2, 6, ${0.96 * vortexAlpha})`);
  coreGrad.addColorStop(1.0, `rgba(220, 20, 20, ${0.70 * vortexAlpha})`);
  ctx.fillStyle = coreGrad;
  ctx.fill();

  // Pass C: Helical Braided Energy Ribbons (4 Ascending Strands)
  const strandCount = 4;
  for (let st = 0; st < strandCount; st++) {
    const phaseOffset = st * (Math.PI / 2);
    ctx.beginPath();
    for (let step = 0; step <= numYSteps; step++) {
      const frac = step / numYSteps;
      const y = beamBottomY + (beamTopY - beamBottomY) * frac;
      const helix = Math.sin(y * 0.024 - now * 0.040 + phaseOffset) * (pillarW * 0.65);
      const jitter = ((Math.sin(now * 0.05 + step) - 0.5) * 2.5);
      const hx = helix + jitter;
      if (step === 0) ctx.moveTo(hx, y);
      else ctx.lineTo(hx, y);
    }
    // Outer Crimson Strand
    ctx.strokeStyle = (st % 2 === 0) 
      ? `rgba(255, 30, 20, ${0.85 * vortexAlpha})` 
      : `rgba(0, 229, 255, ${0.75 * vortexAlpha})`;
    ctx.lineWidth = 3.6;
    ctx.stroke();

    // Hot White Core Strand
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * vortexAlpha})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Pass D: High-Voltage Vertical Branching Lightning Tendrils
  const boltCount = 3;
  for (let b = 0; b < boltCount; b++) {
    const boltPhase = b * (Math.PI * 2 / 3);
    ctx.beginPath();
    ctx.moveTo(0, beamBottomY);
    for (let step = 1; step <= 20; step++) {
      const frac = step / 20;
      const by = beamBottomY + (beamTopY - beamBottomY) * frac;
      const bjitter = Math.sin(by * 0.03 + now * 0.03 + boltPhase) * (pillarW * 0.40) + ((Math.random() - 0.5) * 10);
      ctx.lineTo(bjitter, by);
    }
    ctx.strokeStyle = `rgba(255, 20, 20, ${0.85 * vortexAlpha})`;
    ctx.lineWidth = 4.2;
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * vortexAlpha})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  // ── 4. Central Singularity Compression Sphere & Equator Rings ──
  if (isCompressing) {
    const singR = r * (1.6 - compProg * 0.55);
    const singAlpha = Math.min(1.0, compProg * 1.6);

    // Dense Black Hole Singularity Core
    const singGrad = ctx.createRadialGradient(0, 0, singR * 0.2, 0, 0, singR);
    singGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    singGrad.addColorStop(0.20, `rgba(0, 229, 255, ${0.95 * singAlpha})`);
    singGrad.addColorStop(0.45, `rgba(255, 30, 20, ${0.95 * singAlpha})`);
    singGrad.addColorStop(0.80, `rgba(4, 2, 4, ${0.98 * singAlpha})`);
    singGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = singGrad;
    ctx.beginPath();
    ctx.arc(0, 0, singR * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // High-Speed Rotating Equator Rings
    const ringSteps = 48;
    const ringRadX = singR * 1.45;
    const ringRadY = singR * 0.45;

    ctx.save();
    ctx.rotate(now * 0.008);
    ctx.beginPath();
    for (let i = 0; i <= ringSteps; i++) {
      const t = (i / ringSteps) * Math.PI * 2;
      const wave = Math.sin(t * 8 + now * 0.04) * 3.5;
      const rx = (ringRadX + wave) * Math.cos(t);
      const ry = (ringRadY + wave * 0.4) * Math.sin(t);
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.strokeStyle = `rgba(255, 30, 20, ${0.90 * singAlpha})`;
    ctx.lineWidth = 4.5;
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * singAlpha})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
  }

  // ── 5. Rising Spiritual Flame Embers ──
  const emberCount = 8;
  for (let e = 0; e < emberCount; e++) {
    const eProg = ((now * 0.0020 + e * 0.125) % 1.0);
    const ey = -eProg * 220;
    const ex = Math.sin(now * 0.015 + e * 2) * (pillarW * 0.45 * (1 - eProg * 0.5));
    const er = (1.5 + (e % 3) * 0.8) * (1 - eProg * 0.6);
    ctx.fillStyle = (e % 2 === 0) 
      ? `rgba(255, 255, 255, ${0.90 * (1 - eProg)})` 
      : `rgba(255, 40, 20, ${0.90 * (1 - eProg)})`;
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function _drawBankaiEruptionBurst(ctx, r, fighter, now) {
  const maxB = fighter.bankaiBurstMax || 36;
  const curB = fighter.bankaiBurstTimer || 0;
  const burstProg = Math.min(1.0, Math.max(0.0, 1.0 - (curB / maxB)));
  const alpha = Math.pow(1.0 - burstProg, 0.85);

  if (alpha <= 0.01) return;

  ctx.save();

  // ── 1. Concentric Expanding Shockwave Blast Rings ──
  // Ring 1: Fast Supersonic Needle Shockwave Ring
  const needleR = r + burstProg * 340;
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
  ctx.lineWidth = Math.max(1.0, 4.5 * (1.0 - burstProg));
  ctx.beginPath();
  ctx.arc(0, 0, needleR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = `rgba(0, 229, 255, ${0.80 * alpha})`;
  ctx.lineWidth = Math.max(1.0, 9.0 * (1.0 - burstProg));
  ctx.beginPath();
  ctx.arc(0, 0, needleR, 0, Math.PI * 2);
  ctx.stroke();

  // Ring 2: Thick Crimson-Black Spiritual Blastwave
  const blastR = r + Math.pow(burstProg, 0.72) * 220;
  const blastSteps = 48;
  ctx.beginPath();
  for (let i = 0; i <= blastSteps; i++) {
    const t = (i / blastSteps) * Math.PI * 2;
    const wave = Math.sin(t * 10 + now * 0.03) * (5.0 * (1.0 - burstProg));
    const bx = (blastR + wave) * Math.cos(t);
    const by = (blastR + wave) * Math.sin(t);
    if (i === 0) ctx.moveTo(bx, by);
    else ctx.lineTo(bx, by);
  }
  ctx.closePath();
  ctx.strokeStyle = `rgba(220, 20, 20, ${0.85 * alpha})`;
  ctx.lineWidth = Math.max(1.5, 8.5 * (1.0 - burstProg));
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 60, 20, ${0.95 * alpha})`;
  ctx.lineWidth = Math.max(1.0, 3.2 * (1.0 - burstProg));
  ctx.stroke();

  ctx.strokeStyle = `rgba(255, 255, 240, ${0.95 * alpha})`;
  ctx.lineWidth = Math.max(0.8, 1.2 * (1.0 - burstProg));
  ctx.stroke();

  // Ring 3: Inner Void Implosion Shock Ring
  const innerR = r + burstProg * 120;
  ctx.strokeStyle = `rgba(10, 5, 12, ${0.90 * alpha})`;
  ctx.lineWidth = Math.max(1.0, 12.0 * (1.0 - burstProg));
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.stroke();

  // ── 2. Shattering Crystalline Reiatsu Shards ──
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

        const sz = shard.size || 7.0;
        // 4-point crystalline diamond shard polygon
        ctx.beginPath();
        ctx.moveTo(0, -sz * 1.3);
        ctx.lineTo(sz * 0.6, 0);
        ctx.lineTo(0, sz * 1.3);
        ctx.lineTo(-sz * 0.6, 0);
        ctx.closePath();

        ctx.fillStyle = shard.color || '#111111';
        ctx.globalAlpha = shardAlpha;
        ctx.fill();

        ctx.strokeStyle = (s % 2 === 0) ? `rgba(255, 255, 255, ${0.90 * shardAlpha})` : `rgba(0, 229, 255, ${0.85 * shardAlpha})`;
        ctx.lineWidth = 1.0;
        ctx.stroke();

        ctx.restore();
      }
    }
  }

  // ── 3. Billowing Dark Ink-Smoke & Spirit Flame Wisps ──
  const smokeCount = 8;
  for (let sm = 0; sm < smokeCount; sm++) {
    const smAngle = sm * (Math.PI * 2 / smokeCount) + 0.2;
    const smDist = r * 0.8 + burstProg * 90;
    const smX = Math.cos(smAngle) * smDist;
    const smY = Math.sin(smAngle) * smDist;
    const smR = (12 + (sm % 3) * 6) * (1.0 + burstProg * 0.8);

    const smGrad = ctx.createRadialGradient(smX, smY, 0, smX, smY, smR);
    smGrad.addColorStop(0.0, `rgba(12, 4, 10, ${0.80 * alpha})`);
    smGrad.addColorStop(0.60, `rgba(220, 20, 20, ${0.40 * alpha})`);
    smGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = smGrad;
    ctx.beginPath();
    ctx.arc(smX, smY, smR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function _drawBankaiActiveFlameWisps(ctx, r, now) {
  ctx.save();
  const wispCount = 5;
  for (let w = 0; w < wispCount; w++) {
    const wProg = ((now * 0.0025 + w * 0.20) % 1.0);
    const wAng = (w / wispCount) * Math.PI * 2 + Math.sin(now * 0.01 + w) * 0.25;
    const wDist = r * (0.85 + 0.35 * wProg);
    const wx = Math.cos(wAng) * wDist;
    const wy = Math.sin(wAng) * wDist - wProg * 18; // rises slightly
    const wR = (3.5 + (w % 2) * 2.0) * (1.0 - wProg * 0.7);
    const wAlpha = Math.sin(wProg * Math.PI) * 0.80;

    const wGrad = ctx.createRadialGradient(wx, wy, 0, wx, wy, wR * 1.5);
    wGrad.addColorStop(0.0, `rgba(255, 255, 255, ${0.95 * wAlpha})`);
    wGrad.addColorStop(0.40, (w % 2 === 0) ? `rgba(0, 229, 255, ${0.90 * wAlpha})` : `rgba(255, 30, 20, ${0.90 * wAlpha})`);
    wGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = wGrad;
    ctx.beginPath();
    ctx.arc(wx, wy, wR * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function _drawBankaiChargingAura(ctx, startX, len, bankaiProg) {
  const now = Date.now();
  const pulse = 1.0 + 0.22 * Math.sin(now * 0.045);
  const glowH = 18 * pulse * (0.85 + 0.45 * bankaiProg);

  ctx.save();
  // Multi-Pass Roaring Black & Crimson Reiatsu Plasma Gradient
  const grad = ctx.createLinearGradient(startX, 0, startX + len, 0);
  grad.addColorStop(0.0, 'rgba(6, 2, 8, 0.98)');
  grad.addColorStop(0.30, 'rgba(220, 20, 20, 0.95)');
  grad.addColorStop(0.70, 'rgba(255, 50, 0, 0.92)');
  grad.addColorStop(0.92, 'rgba(0, 229, 255, 0.95)');
  grad.addColorStop(1.0, 'rgba(255, 255, 255, 1.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(startX - 2, -glowH * 0.5, len + 10, glowH);

  // Outer Crimson Corona Fringe
  ctx.strokeStyle = 'rgba(255, 30, 20, 0.85)';
  ctx.lineWidth = 3.5;
  ctx.strokeRect(startX - 2, -glowH * 0.5, len + 10, glowH);

  // Crackling High-Voltage White-Hot Lightning Arcs along the Blade
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(startX, 0);
  for (let i = 1; i <= 5; i++) {
    const lx = startX + (i / 5) * len;
    const ly = ((i % 2 === 0) ? 1 : -1) * (glowH * 0.45) + ((Math.sin(now * 0.06 + i) - 0.5) * 3);
    ctx.lineTo(lx, ly);
  }
  ctx.stroke();

  // Advancing Tip Plasma Burst
  const tipX = startX + len;
  const tipR = (10 + 6 * Math.sin(now * 0.05)) * (0.8 + 0.4 * bankaiProg);
  const tipGrad = ctx.createRadialGradient(tipX, 0, 0, tipX, 0, tipR);
  tipGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  tipGrad.addColorStop(0.35, 'rgba(0, 229, 255, 0.95)');
  tipGrad.addColorStop(0.70, 'rgba(255, 30, 20, 0.80)');
  tipGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = tipGrad;
  ctx.beginPath();
  ctx.arc(tipX, 0, tipR, 0, Math.PI * 2);
  ctx.fill();

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

export function getZangetsuPommelWorldPos(fighter) {
  const r = fighter.r || 25;
  const angle = fighter.gunAngle || 0;
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  const isSlashing = fighter.slashSwingTimer > 0;
  const maxT = fighter.slashSwingMaxTimer || 22;
  const rawSlashProg = isSlashing ? Math.min(1.0, Math.max(0.0, 1.0 - (fighter.slashSwingTimer / maxT))) : 0;
  const isChanneling = Boolean(fighter.isChannelingGetsuga);

  const isCountdownOrPreview = (typeof state !== 'undefined' && (
    state.gameState === 'countdown' || 
    state.gameState === 'weaponIndex' || 
    state.gameState === 'characterSelect' || 
    state.gameState === 'indexDetail' || 
    state.gameState === 'matchEnd' || 
    state.gameState === 'roundEnd'
  )) || fighter.isDemoFighter || fighter._isWinnerReveal;

  let localSwordAngle = -0.16;
  let thrustDistance = 0;
  let bodyShiftX = 0;

  if (isChanneling) {
    const chargeMax = fighter.getsugaChargeMax || CONFIG.ichigo?.getsugaChargeFrames || 50;
    const chargeProg = Math.min(1.0, Math.max(0.0, 1.0 - ((fighter.getsugaChargeTimer || 0) / chargeMax)));
    const liftEase = Math.min(1.0, chargeProg * 1.7);
    const smoothLift = liftEase * liftEase * (3 - 2 * liftEase);

    localSwordAngle = -0.16 + (-2.10 - (-0.16)) * smoothLift;
    thrustDistance = -4 - 6 * smoothLift;
    bodyShiftX = -1.5 - 3.0 * smoothLift;
  } else if (isSlashing) {
    if (fighter.isGetsugaSlash) {
      if (rawSlashProg < 0.50) {
        const p = rawSlashProg / 0.50;
        const sweepCurve = p * p * (3 - 2 * p);
        localSwordAngle = -2.10 + (1.35 - (-2.10)) * sweepCurve;
        thrustDistance = -10 + 26 * Math.sin(p * Math.PI * 0.5);
        bodyShiftX = -4.5 + 9.5 * Math.sin(p * Math.PI * 0.5);
      } else {
        const p = (rawSlashProg - 0.50) / 0.50;
        const easeP = 0.5 + 0.5 * Math.cos(p * Math.PI);
        localSwordAngle = -0.16 + (1.35 - (-0.16)) * easeP;
        thrustDistance = 16 * easeP;
        bodyShiftX = 5.0 * easeP;
      }
    } else {
      if (rawSlashProg < 0.10) {
        const p = rawSlashProg / 0.10;
        const easeP = p * (2 - p);
        localSwordAngle = -0.16 + (-1.35 - (-0.16)) * easeP;
        thrustDistance = -8 * easeP;
        bodyShiftX = -2.5 * easeP;
      } else if (rawSlashProg < 0.55) {
        const p = (rawSlashProg - 0.10) / 0.45;
        const sweepCurve = p * p * (3 - 2 * p);
        localSwordAngle = -1.35 + (1.20 - (-1.35)) * sweepCurve;
        thrustDistance = -8 + 22 * Math.sin(p * Math.PI * 0.5);
        bodyShiftX = -2.5 + 6.5 * Math.sin(p * Math.PI * 0.5);
      } else {
        const p = (rawSlashProg - 0.55) / 0.45;
        const easeP = 0.5 + 0.5 * Math.cos(p * Math.PI);
        localSwordAngle = -0.16 + (1.20 - (-0.16)) * easeP;
        thrustDistance = 14 * easeP;
        bodyShiftX = 4.0 * easeP;
      }
    }
  } else if (isCountdownOrPreview) {
    localSwordAngle = Math.PI / 4;
    thrustDistance = 0;
  } else {
    localSwordAngle = -0.16;
    thrustDistance = 0;
  }

  const swordStartX = (isSlashing || !isCountdownOrPreview) ? (r * 0.68) : (-r * 0.68);
  const scale = 0.85;
  const localPommelX = (swordStartX + thrustDistance + bodyShiftX) + (-32 * scale);
  const localPommelY = 0;

  // Apply local sword rotation
  const cosS = Math.cos(localSwordAngle);
  const sinS = Math.sin(localSwordAngle);
  let rotX = localPommelX * cosS - localPommelY * sinS;
  let rotY = localPommelX * sinS + localPommelY * cosS;

  // Apply facing flip
  if (facingLeft) {
    rotY = -rotY;
  }

  // Apply fighter body angle
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const worldX = fighter.x + (rotX * cosA - rotY * sinA);
  const worldY = fighter.y + (rotX * sinA + rotY * cosA);

  return { x: worldX, y: worldY };
}

export function updateZangetsuRibbonPhysics(fighter) {
  if (!fighter || fighter.isFrozenByInfinity || (fighter.timeStopTimer && fighter.timeStopTimer > 0) || (fighter.statusEffects && fighter.statusEffects.timeStopTimer > 0) || (fighter.paralyzeTimer && fighter.paralyzeTimer > 0) || fighter.isParalyzed) return;
  const pommel = getZangetsuPommelWorldPos(fighter);

  if (!fighter.ribbonStrands || fighter.ribbonStrands.length !== 3) {
    fighter.ribbonStrands = [];
    const strandNodeCounts = [8, 7, 6];
    const strandSpreads = [-0.15, 0.0, 0.15];

    for (let s = 0; s < 3; s++) {
      const numNodes = strandNodeCounts[s];
      const nodes = [];
      for (let i = 0; i < numNodes; i++) {
        nodes.push({
          x: pommel.x - i * 4.5,
          y: pommel.y + i * 3.5 + strandSpreads[s] * 6,
          vx: 0,
          vy: 0
        });
      }
      fighter.ribbonStrands.push(nodes);
    }
  }

  const isSlashing = fighter.slashSwingTimer > 0;
  const maxT = fighter.slashSwingMaxTimer || 22;
  const rawSlashProg = isSlashing ? Math.min(1.0, Math.max(0.0, 1.0 - (fighter.slashSwingTimer / maxT))) : 0;
  const isCutting = isSlashing && rawSlashProg >= 0.10 && rawSlashProg <= 0.55;
  const angle = fighter.gunAngle || 0;

  // Rotational whip and radial centrifugal force during cutting stroke
  const whipX = isCutting ? -Math.sin(angle) * 3.8 : 0;
  const whipY = isCutting ? Math.cos(angle) * 3.8 : 0;
  const centrifX = isCutting ? Math.cos(angle) * 2.2 : 0;
  const centrifY = isCutting ? Math.sin(angle) * 2.2 : 0;

  const linkDist = 4.8;
  const substeps = 2;

  // Run 2 physics substeps per frame for ultra-smooth buttery cloth flow
  for (let sub = 0; sub < substeps; sub++) {
    for (let s = 0; s < fighter.ribbonStrands.length; s++) {
      const strand = fighter.ribbonStrands[s];
      strand[0].x = pommel.x;
      strand[0].y = pommel.y;

      for (let i = 1; i < strand.length; i++) {
        const node = strand[i];
        const dragX = -(fighter.vx || 0) * 0.04 + (whipX + centrifX) / (i * 1.2);
        const dragY = -(fighter.vy || 0) * 0.04 + (whipY + centrifY) / (i * 1.2);
        const wave = Math.sin(Date.now() * 0.006 + i * 0.5 + s * 1.1) * 0.14;

        node.vx = (node.vx + dragX * 0.5) * 0.88;
        node.vy = (node.vy + (dragY + 0.15 + wave) * 0.5) * 0.88;

        node.x += node.vx * 0.5;
        node.y += node.vy * 0.5;
      }

      // Constraint relaxation
      for (let iter = 0; iter < 6; iter++) {
        for (let i = 1; i < strand.length; i++) {
          const prev = strand[i - 1];
          const node = strand[i];
          const dx = node.x - prev.x;
          const dy = node.y - prev.y;
          const dist = Math.hypot(dx, dy) || 0.001;

          if (dist !== linkDist) {
            const delta = (dist - linkDist) / dist;
            if (i === 1) {
              node.x -= dx * delta;
              node.y -= dy * delta;
            } else {
              node.x -= dx * delta * 0.5;
              node.y -= dy * delta * 0.5;
              prev.x += dx * delta * 0.5;
              prev.y += dy * delta * 0.5;
            }
          }
        }
      }
    }
  }
}

