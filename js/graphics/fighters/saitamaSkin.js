import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';

/**
 * Visual Skin Renderer for Saitama (The Caped Baldy)
 * Recreated precisely matching Yuji/Todo punch animation standards & anime flowing cape folds.
 */
export function drawSaitamaSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const now = Date.now();

  // 0. Draw afterimages (Teleport / sidestep ghost model skin) at their absolute coordinates
  if (fighter.afterImages && fighter.afterImages.length > 0) {
    ctx.save();
    for (let i = 0; i < fighter.afterImages.length; i++) {
      const ai = fighter.afterImages[i];
      if (!ai || ai.timer <= 0) continue;
      const progress = ai.timer / (ai.maxTimer || 10);
      const alpha = progress * 0.55;
      const aiAngle = ai.gunAngle !== undefined ? ai.gunAngle : (ai.angle || 0);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(ai.x, ai.y);
      ctx.rotate(aiAngle);

      const facingLeft = Math.abs(aiAngle) > Math.PI / 2;
      if (facingLeft) ctx.scale(1, -1);

      drawSaitamaGhostModel(ctx, ai.r || r);

      ctx.restore();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // Serious Skill Counter Punch Follow-Through MUST NEVER be interrupted/snapped when enemy dies or champion screen triggers
  const isPostCounter = Boolean(fighter._postCounterRecoveryTimer && fighter._postCounterRecoveryTimer > 0);

  // Podium preview check: suppresses combat animation offsets during winner reveal podium display ONLY
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);

  const angle = (isPodiumPreview && !isPostCounter) ? 0 : (fighter.gunAngle || fighter.angle || 0);
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  // Smooth sinusoidal punch progress or counter punch post-punch follow-through
  const isNormalPunching = !isPodiumPreview && Boolean(fighter.punchAnimTimer && fighter.punchAnimTimer > 0);
  const isFlurrying = !isPodiumPreview && Boolean(fighter.isFlurrying);
  const isPunching = isNormalPunching || isPostCounter || isFlurrying;

  let rawProgress = 0;
  let easePunch = 0;
  if (isPunching) {
    if (isFlurrying) {
      // 4-frame fast alternating flurry cycle
      const cycleFrame = (fighter.flurryTimer || 0) % 4;
      rawProgress = cycleFrame / 4;
      easePunch = Math.sin(rawProgress * Math.PI);
    } else if (isPostCounter) {
      // Serious Skill Counter Punch Single Unified Follow-Through:
      // - First 12% of recovery (p < 0.12): Explosive forward punch extension
      // - Middle 58% (0.12 <= p <= 0.70): Heroic follow-through hold at max reach in the air while shockwaves blast & target flies/dies
      // - Final 30% (p > 0.70): Smooth cosine ease-out retraction back to guard
      const maxRec = (typeof CONFIG !== 'undefined' && CONFIG.saitama?.counterPunchRecoveryFrames) || 65;
      const p = Math.min(1.0, Math.max(0.0, 1.0 - (fighter._postCounterRecoveryTimer / maxRec)));
      if (p < 0.12) {
        easePunch = Math.sin((p / 0.12) * (Math.PI / 2));
      } else if (p <= 0.70) {
        easePunch = 1.0;
      } else {
        const retractT = (p - 0.70) / 0.30;
        easePunch = 0.5 * (1 + Math.cos(retractT * Math.PI));
      }
      rawProgress = p;
    } else if (isNormalPunching) {
      const maxT = fighter.punchActiveMaxTime || fighter.punchMaxTime || 14;
      rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
      if (rawProgress < 0.28) {
        easePunch = Math.sin((rawProgress / 0.28) * (Math.PI / 2));
      } else {
        const retractT = (rawProgress - 0.28) / 0.72;
        easePunch = Math.cos(retractT * (Math.PI / 2));
      }
    }
  }

  const lungeExtension = isPunching ? easePunch * (r * 1.5) : 0;
  const oppositeRecoil = isNormalPunching ? -Math.sin(rawProgress * Math.PI) * (r * 0.20) : 0;

  let frontHandX, frontHandY, backHandX, backHandY;

  if (isFlurrying) {
    // Consecutive Normal Punches: True continuous back-and-forth alternating piston punch action
    const t = fighter.flurryTimer || 0;
    // ~5 frames per full back-and-forth cycle
    const cycleFreq = (Math.PI * 2) / 5;
    
    // Back Hand (Right Arm): Smoothly cycles between fully retracted (-r * 0.20) and fully extended forward (+r * 2.35)
    const stroke1 = (Math.sin(t * cycleFreq) + 1) / 2; // 0.0 -> 1.0 -> 0.0
    backHandX = -r * 0.20 + stroke1 * (r * 2.45);
    backHandY = -r * 0.28 + Math.cos(t * cycleFreq) * (r * 0.06);

    // Front Hand (Left Arm): In exact opposite anti-phase (+ PI)
    const stroke2 = (Math.sin(t * cycleFreq + Math.PI) + 1) / 2; // 1.0 -> 0.0 -> 1.0
    frontHandX = -r * 0.20 + stroke2 * (r * 2.45);
    frontHandY =  r * 0.28 - Math.cos(t * cycleFreq) * (r * 0.06);
  } else if (isPunching) {
    // All punches executed with the front hand extending forward from right edge
    frontHandX = r * 0.95 + lungeExtension * 1.40;
    frontHandY = isPostCounter ? 0 : Math.sin(rawProgress * Math.PI) * (r * 0.20);
    backHandX  = 0; backHandY  = 0;
  } else {
    // Idle brawler guard stance: front hand at the right edge of body circle
    frontHandX = r * 0.95;
    frontHandY = 0;
    backHandX  = 0; backHandY  = 0;
  }

  const handRadius = Math.max(r * 0.38, getHandSize(8.5));

  // Calculate Serious Counter or Basic Attack charging progress and scale
  const isChargingCounter = !isPodiumPreview && Boolean(fighter._counterPunchTimer && fighter._counterPunchTimer > 0);
  const isChargingBasic = !isPodiumPreview && Boolean(fighter.basicPunchChargeTimer && fighter.basicPunchChargeTimer > 0);
  const isChargingAny = isChargingCounter || isChargingBasic;

  let chargeScale = 0;
  let chargePullbackProgress = 0;
  if (isChargingCounter) {
    const maxPose = (typeof CONFIG !== 'undefined' && CONFIG.saitama?.counterPunchPoseFrames) || (typeof state !== 'undefined' && state.config && state.config.saitama && state.config.saitama.counterPunchPoseFrames) || 100;
    const progress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter._counterPunchTimer / maxPose)));
    chargePullbackProgress = progress; // From 0.0 to 1.0
    if (progress > 0.25) {
      chargeScale = (progress - 0.25) / 0.75;
    }
  } else if (isChargingBasic) {
    const maxCharge = fighter.basicPunchChargeMaxTimer || 18;
    const progress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.basicPunchChargeTimer / maxCharge)));
    chargePullbackProgress = progress;
    chargeScale = Math.min(1.0, progress * 1.2);
  }

  // Smoothly reposition the charging hand to the center of the body (drawing back to deliver the punch)
  if (isChargingAny) {
    // Smooth ease-out curve for the pullback
    const easePullback = 1 - Math.pow(1 - chargePullbackProgress, 3);
    
    // Target position: drawn back to the core
    const targetX = -r * 0.4;
    const targetY = 0;
    
    frontHandX = frontHandX + (targetX - frontHandX) * easePullback;
    frontHandY = frontHandY + (targetY - frontHandY) * easePullback;
  }

  // ─────────────────────────────────────────────
  // 1. DRAW CAPE (Anime Flowing Hero Cape & Collar Buttons)
  // ─────────────────────────────────────────────
  ctx.save();
  const vx = fighter.vx || 0;
  const vy = fighter.vy || 0;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  let localVx = vx * cosA + vy * sinA;
  let localVy = -vx * sinA + vy * cosA;
  if (facingLeft) localVy = -localVy;

  const inertiaX = Math.max(-r * 1.2, Math.min(r * 0.8, -localVx * 2.2));
  const inertiaY = Math.max(-r * 1.0, Math.min(r * 1.0, -localVy * 2.2));

  const gentleSway1 = Math.sin(now * 0.003) * (r * 0.12);
  const gentleSway2 = Math.cos(now * 0.0025) * (r * 0.10);
  const waveRipple = Math.sin(now * 0.006) * (r * 0.08);

  // Cape Attachment / Collar Button Positions (Back of shoulders)
  const topAttachX = -r * 0.35, topAttachY = -r * 0.35;
  const botAttachX = -r * 0.35, botAttachY = -r * 0.05;

  // Outer Cape Boundary Points (Flowing backwards into -X)
  const topCapeTipX = -r * 1.85 + inertiaX * 0.8 + gentleSway1;
  const topCapeTipY = -r * 0.85 + inertiaY * 0.6 - gentleSway2;

  const midCapeFoldX = -r * 2.1 + inertiaX * 1.0 + gentleSway2;
  const midCapeFoldY = 0 + inertiaY * 0.8 + waveRipple;

  const botCapeTipX = -r * 1.75 + inertiaX * 0.8 - gentleSway1;
  const botCapeTipY = r * 0.75 + inertiaY * 0.6 + gentleSway2;

  // 1a. Draw Cape Shadow / Under-layer (Slightly darker grey for 3D depth)
  ctx.fillStyle = '#E8E8E8';
  ctx.beginPath();
  ctx.moveTo(topAttachX, topAttachY - 3);
  ctx.bezierCurveTo(
    -r * 1.0 + inertiaX * 0.4, -r * 0.7 + inertiaY * 0.3 + gentleSway1,
    -r * 1.5 + inertiaX * 0.6, -r * 0.95 + inertiaY * 0.5,
    topCapeTipX - 4, topCapeTipY - 2
  );
  ctx.quadraticCurveTo(midCapeFoldX - 5, midCapeFoldY + 4, botCapeTipX - 3, botCapeTipY + 4);
  ctx.bezierCurveTo(
    -r * 1.3 + inertiaX * 0.6, r * 0.65 + inertiaY * 0.4,
    -r * 0.8 + inertiaX * 0.3, r * 0.25 + inertiaY * 0.2,
    botAttachX, botAttachY + 3
  );
  ctx.closePath();
  ctx.fill();

  // 1b. Main White Cape Body (#FFFFFF with clean #000000 outline)
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.8;

  ctx.beginPath();
  ctx.moveTo(topAttachX, topAttachY);

  // Upper wing curve flowing back & up to top cape tip
  ctx.bezierCurveTo(
    -r * 0.95 + inertiaX * 0.4, -r * 0.65 + inertiaY * 0.3 + gentleSway1,
    -r * 1.45 + inertiaX * 0.7 + gentleSway2, -r * 0.9 + inertiaY * 0.5 + waveRipple,
    topCapeTipX, topCapeTipY
  );

  // Wavy ripples along the bottom-back trailing edge
  ctx.quadraticCurveTo(-r * 1.95 + inertiaX * 0.9 + gentleSway2, -r * 0.4 + inertiaY * 0.7, midCapeFoldX, midCapeFoldY);
  ctx.quadraticCurveTo(-r * 1.9 + inertiaX * 0.8 - gentleSway1, r * 0.4 + inertiaY * 0.7, botCapeTipX, botCapeTipY);

  // Lower wing curve sweeping back to bottom shoulder button
  ctx.bezierCurveTo(
    -r * 1.35 + inertiaX * 0.6 - gentleSway2, r * 0.55 + inertiaY * 0.4 - waveRipple,
    -r * 0.75 + inertiaX * 0.3, r * 0.2 + inertiaY * 0.2,
    botAttachX, botAttachY
  );

  ctx.lineTo(topAttachX, topAttachY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 1c. Internal Fold Creases (Anime fold accent lines)
  ctx.strokeStyle = '#D0D0D0';
  ctx.lineWidth = 1.6;

  ctx.beginPath();
  ctx.moveTo(topAttachX, topAttachY);
  ctx.bezierCurveTo(
    -r * 0.8 + inertiaX * 0.3, -r * 0.45 + gentleSway1,
    -r * 1.3 + inertiaX * 0.6, -r * 0.3 + waveRipple,
    midCapeFoldX + r * 0.2, midCapeFoldY - r * 0.2
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(botAttachX, botAttachY);
  ctx.bezierCurveTo(
    -r * 0.7 + inertiaX * 0.3, r * 0.1 - gentleSway2,
    -r * 1.2 + inertiaX * 0.5, r * 0.3 + waveRipple,
    botCapeTipX + r * 0.2, botCapeTipY - r * 0.1
  );
  ctx.stroke();

  // 1d. Cape Collar Buttons
  const drawCollarButton = (bx, by) => {
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.11, 0, Math.PI * 2);
    ctx.fillStyle = '#1A1A1A';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(bx - r * 0.03, by - r * 0.03, r * 0.035, 0, Math.PI * 2);
    ctx.fillStyle = '#666666';
    ctx.fill();
  };

  drawCollarButton(topAttachX, topAttachY);
  drawCollarButton(botAttachX, botAttachY);

  ctx.restore();

  // ─────────────────────────────────────────────
  // 2. BOREDOM / POWER AURA (No shadowBlur - Rule #11)
  // ─────────────────────────────────────────────
  const boredomStacks = fighter.boredomStacks || 0;
  if (boredomStacks > 0 && !isLowQuality) {
    ctx.save();
    for (let i = 1; i <= boredomStacks; i++) {
      const pulseR = r + 4 + i * 5 + Math.sin(now * 0.006 + i) * 2;
      const alpha = 0.15 + (i / boredomStacks) * 0.2;
      ctx.beginPath();
      ctx.arc(0, 0, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 235, 120, ${alpha})`;
      ctx.lineWidth = 1.8;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ─────────────────────────────────────────────
  // 3. SERIOUS PUNCH CHARGING PRESSURE RIPPLE
  // ─────────────────────────────────────────────
  if (fighter.isChargingSeriousPunch) {
    ctx.save();
    const chargeProg = (fighter.seriousPunchChargeTimer || 0) / (fighter.seriousPunchWindupMax || 90);
    const waveCount = 3;
    for (let w = 0; w < waveCount; w++) {
      const wavePhase = (chargeProg * 3 + w / waveCount) % 1.0;
      const waveR = r + wavePhase * 60;
      const waveAlpha = Math.sin((1 - wavePhase) * Math.PI) * 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, waveR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${waveAlpha})`;
      ctx.lineWidth = 3 - wavePhase * 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ── Render Back Hand (Back Layer - Active during Consecutive Normal Punches Flurry) ──
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands || isPodiumPreview;
  if (!shouldHideHands && !fighter.hideBackHand && isFlurrying) {
    drawSaitamaArm(ctx, r, backHandX, backHandY, handRadius, -r * 0.28, false);
  }

  // ─────────────────────────────────────────────
  // 4. MAIN CIRCLE BODY (EXACT USER DRAWING LAYOUT)
  // ─────────────────────────────────────────────
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // 4a. Top Bald Head Skin Section (#FFE0BD)
  ctx.fillStyle = '#FFE0BD';
  ctx.fillRect(-r, -r, r * 2, r * 0.65);

  // 4b. Upper & Lower Yellow Hero Suit Section (#FFEB94)
  ctx.fillStyle = '#FFEB94';
  ctx.fillRect(-r, -r * 0.35, r * 2, r * 1.7);

  // 4c. Horizontal Black Belt (#111111)
  ctx.fillStyle = '#111111';
  ctx.fillRect(-r, r * 0.25, r * 2, r * 0.22);

  // 4d. Golden Oval Belt Buckle in the Center (#C88A00)
  ctx.beginPath();
  ctx.ellipse(0, r * 0.36, r * 0.22, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#C88A00';
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // 4e. Crimson Red Bottom Section / Boots (#C80000)
  ctx.fillStyle = '#C80000';
  ctx.fillRect(-r, r * 0.68, r * 2, r * 0.4);

  ctx.restore(); // Undo circle clipping

  // 4f. Thick Solid Black Outer Outline Ring (#000000)
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4.5;
  ctx.stroke();

  // ── Render Front Hand (Front Layer - On Top of Body Circle) ──
  if (!shouldHideHands && !fighter.hideFrontHand) {
    const isPunchHandFront = isFlurrying ? true : fighter.isRightPunch;
    if (isChargingAny && isPunchHandFront) {
      drawSeriousChargeGlow(ctx, frontHandX, frontHandY, handRadius, chargeScale);
    }
    if (isFlurrying) {
      drawSaitamaArm(ctx, r, frontHandX, frontHandY, handRadius, r * 0.28, true);
    } else {
      // Crisp solid red brawler glove (no stretching arm sleeve)
      ctx.beginPath();
      ctx.arc(frontHandX, frontHandY, handRadius, 0, Math.PI * 2);
      ctx.fillStyle = '#C80000';
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3.0;
      ctx.stroke();

      // Knuckle highlight
      ctx.beginPath();
      ctx.arc(frontHandX + handRadius * 0.22, frontHandY - handRadius * 0.18, handRadius * 0.32, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 130, 130, 0.55)';
      ctx.fill();
    }
  }

  // ── Consecutive Normal Punches: Multi-Fist Barrage (Anime Ghost Fists) ──
  if (isFlurrying && !shouldHideHands) {
    drawConsecutivePunchesBarrage(ctx, r, handRadius, fighter.flurryTimer || 0);
  }

  // Draw counter punch charging overlay effects (spark arcs, star lines)
  if (isChargingCounter && !shouldHideHands) {
    const isPunchHandFront = fighter.isRightPunch;
    const activeHandX = isPunchHandFront ? frontHandX : backHandX;
    const activeHandY = isPunchHandFront ? frontHandY : backHandY;
    drawSeriousChargeOverlay(ctx, activeHandX, activeHandY, handRadius, chargeScale);
  }

  // Status Overlays (stun, slow, burn, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}

/**
 * Draws a punching arm with yellow hero suit sleeve and red glove
 */
function drawSaitamaArm(ctx, r, handX, handY, handRadius, shoulderY, isFront = false) {
  ctx.save();
  
  // 1. Arm Sleeve extending from torso to glove
  const startX = r * 0.15;
  const startY = shoulderY;
  const endX = handX;
  const endY = handY;

  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.hypot(dx, dy);

  if (dist > handRadius * 0.4) {
    const angle = Math.atan2(dy, dx);
    const perpAngle = angle + Math.PI / 2;
    const sleeveW = handRadius * 0.72;
    const px = Math.cos(perpAngle) * sleeveW;
    const py = Math.sin(perpAngle) * sleeveW;

    ctx.beginPath();
    ctx.moveTo(startX + px * 0.75, startY + py * 0.75);
    ctx.lineTo(endX - Math.cos(angle) * (handRadius * 0.3) + px, endY - Math.sin(angle) * (handRadius * 0.3) + py);
    ctx.lineTo(endX - Math.cos(angle) * (handRadius * 0.3) - px, endY - Math.sin(angle) * (handRadius * 0.3) - py);
    ctx.lineTo(startX - px * 0.75, startY - py * 0.75);
    ctx.closePath();
    ctx.fillStyle = '#FFEB94';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }

  // 2. Red Glove
  ctx.beginPath();
  ctx.arc(handX, handY, handRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#C80000';
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.8;
  ctx.stroke();

  // Speed highlight on glove knuckle
  ctx.beginPath();
  ctx.arc(handX + handRadius * 0.22, handY - handRadius * 0.18, handRadius * 0.32, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 130, 130, 0.55)';
  ctx.fill();

  ctx.restore();
}

/**
 * Draws the iconic multi-fist optical illusion barrage during Consecutive Normal Punches
 * Fists continuously animate back-and-forth in staggered phases.
 */
function drawConsecutivePunchesBarrage(ctx, r, handRadius, flurryTimer) {
  const lanes = [
    { y: -r * 0.55, phase: 0 },
    { y: -r * 0.33, phase: Math.PI * 0.66 },
    { y: -r * 0.11, phase: Math.PI * 1.33 },
    { y:  r * 0.11, phase: Math.PI * 0.33 },
    { y:  r * 0.33, phase: Math.PI * 1.0 },
    { y:  r * 0.55, phase: Math.PI * 1.66 }
  ];

  const cycleFreq = (Math.PI * 2) / 5; // ~5 frames per full forward/backward cycle

  ctx.save();
  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    const curPhase = flurryTimer * cycleFreq + lane.phase;
    
    // Continuous back-and-forth stroke (0.0 = fully retracted, 1.0 = fully extended forward)
    const stroke = (Math.sin(curPhase) + 1) / 2; // 0.0 to 1.0
    const forwardVel = Math.cos(curPhase); // > 0 moving forward, < 0 pulling backward

    const fistX = -r * 0.10 + stroke * (r * 2.40);
    const fistY = lane.y + Math.sin(curPhase * 0.5) * (r * 0.05);
    const fRadius = handRadius * (0.80 + stroke * 0.22);
    const alpha = 0.40 + stroke * 0.55;

    ctx.save();
    ctx.globalAlpha = alpha;

    // 1. Arm Sleeve Streak connecting from body to punching glove
    ctx.beginPath();
    const perpY = handRadius * 0.55;
    ctx.moveTo(r * 0.25, fistY * 0.5 - perpY * 0.6);
    ctx.lineTo(fistX - fRadius * 0.4, fistY - perpY);
    ctx.lineTo(fistX - fRadius * 0.4, fistY + perpY);
    ctx.lineTo(r * 0.25, fistY * 0.5 + perpY * 0.6);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 235, 148, 0.60)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 2. Forward punch wind / motion blur speed lines (only while thrusting forward)
    if (forwardVel > 0) {
      ctx.beginPath();
      ctx.moveTo(fistX - fRadius * 1.3, fistY - fRadius * 0.8);
      ctx.lineTo(fistX + fRadius * 0.8, fistY);
      ctx.lineTo(fistX - fRadius * 1.3, fistY + fRadius * 0.8);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Golden concussive pressure ring at tip
      ctx.beginPath();
      ctx.arc(fistX, fistY, fRadius + 3, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.strokeStyle = 'rgba(255, 220, 80, 0.85)';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    // 3. Ghost Red Glove
    ctx.beginPath();
    ctx.arc(fistX, fistY, fRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#C80000';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.restore();
  }
  ctx.restore();
}

/**
 * Draws a full Saitama model ghost skin afterimage
 */
function drawSaitamaGhostModel(ctx, r) {
  // 1. Cape
  ctx.save();
  const topAttachX = -r * 0.35, topAttachY = -r * 0.35;
  const botAttachX = -r * 0.35, botAttachY = -r * 0.05;
  const topCapeTipX = -r * 1.85, topCapeTipY = -r * 0.85;
  const midCapeFoldX = -r * 2.1, midCapeFoldY = 0;
  const botCapeTipX = -r * 1.75, botCapeTipY = r * 0.75;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.0;

  ctx.beginPath();
  ctx.moveTo(topAttachX, topAttachY);
  ctx.bezierCurveTo(-r * 0.95, -r * 0.65, -r * 1.45, -r * 0.9, topCapeTipX, topCapeTipY);
  ctx.quadraticCurveTo(-r * 1.95, -r * 0.4, midCapeFoldX, midCapeFoldY);
  ctx.quadraticCurveTo(-r * 1.9, r * 0.4, botCapeTipX, botCapeTipY);
  ctx.bezierCurveTo(-r * 1.35, r * 0.55, -r * 0.75, r * 0.2, botAttachX, botAttachY);
  ctx.lineTo(topAttachX, topAttachY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 2. Hands (Back & Front)
  const handRadius = Math.max(r * 0.38, 8.5);
  const frontHandX = r * 0.85, frontHandY = r * 0.15;
  const backHandX = 0, backHandY = -r * 0.15;

  // Back Hand
  ctx.beginPath();
  ctx.arc(backHandX, backHandY, handRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#C80000';
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // 3. Body Circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // Bald Head
  ctx.fillStyle = '#FFE0BD';
  ctx.fillRect(-r, -r, r * 2, r * 0.65);

  // Yellow Suit
  ctx.fillStyle = '#FFEB94';
  ctx.fillRect(-r, -r * 0.35, r * 2, r * 1.7);

  // Black Belt
  ctx.fillStyle = '#111111';
  ctx.fillRect(-r, r * 0.25, r * 2, r * 0.22);

  // Golden Buckle
  ctx.beginPath();
  ctx.ellipse(0, r * 0.36, r * 0.22, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#C88A00';
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Red Boots
  ctx.fillStyle = '#C80000';
  ctx.fillRect(-r, r * 0.68, r * 2, r * 0.4);

  ctx.restore(); // Undo clip

  // Outer Body Outline
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Front Hand
  ctx.beginPath();
  ctx.arc(frontHandX, frontHandY, handRadius, 0, Math.PI * 2);
  ctx.fillStyle = '#C80000';
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Golden Speed Aura Overlay Ring
  ctx.beginPath();
  ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 230, 100, 0.6)';
  ctx.lineWidth = 2.0;
  ctx.stroke();
}

function drawSeriousChargeGlow(ctx, x, y, handRadius, scale) {
  if (scale <= 0) return;
  const now = Date.now();
  const pulse = 1.0 + Math.sin(now * 0.025) * 0.25;
  const glowRadius = handRadius * 3.8 * pulse * scale;

  const gradient = ctx.createRadialGradient(x, y, handRadius * 0.4 * scale, x, y, glowRadius);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  gradient.addColorStop(0.25, `rgba(255, 215, 0, ${0.7 * scale})`); // Gold
  gradient.addColorStop(0.65, `rgba(255, 69, 0, ${0.35 * scale})`);  // Orange/Red
  gradient.addColorStop(1, 'rgba(255, 69, 0, 0)');

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}

function drawSeriousChargeOverlay(ctx, x, y, handRadius, scale) {
  if (scale <= 0) return;
  const now = Date.now();
  const pulse = 1.0 + Math.sin(now * 0.025) * 0.25;

  // 1. Draw rotating white/gold energy star lines
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(now * 0.012);
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * scale})`;
  ctx.lineWidth = 2.0 * scale;

  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(handRadius * 0.8 * scale, 0);
    ctx.lineTo(handRadius * 2.2 * pulse * scale, 0);
    ctx.stroke();
  }
  ctx.restore();

  // 2. Draw crackling electric arcs drawing into the fist
  ctx.save();
  ctx.strokeStyle = `rgba(255, 235, 148, ${scale})`; // White-gold color matching his suit accent
  ctx.lineWidth = 2.0 * scale;
  const numArcs = 3;
  for (let i = 0; i < numArcs; i++) {
    const angleOffset = (now * 0.006 + i * (Math.PI * 2 / numArcs)) % (Math.PI * 2);
    // Draw arcs coming from outside, moving inward
    const startDist = handRadius * (2.8 - ((now * 0.018 + i * 0.5) % 1.8)) * scale;
    if (startDist < handRadius * 0.8 * scale) continue;

    const sx = x + Math.cos(angleOffset) * startDist;
    const sy = y + Math.sin(angleOffset) * startDist;

    // Control point for a wavy arc path
    const ctrlAngle = angleOffset + 0.35;
    const ctrlDist = startDist * 0.5;
    const cx = x + Math.cos(ctrlAngle) * ctrlDist;
    const cy = y + Math.sin(ctrlAngle) * ctrlDist;

    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(cx, cy, x, y);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Draw flashing red "DEATH" Kanji (死) floating aggressively over the charging fist
  if (scale > 0.1) {
    ctx.save();
    // Position slightly above the hand, and add intense trembling
    ctx.translate(x + (Math.random() - 0.5) * 4, y - handRadius * 3.0 + (Math.random() - 0.5) * 4);
    
    // Slight random rotation for chaotic manga sketch energy
    ctx.rotate((Math.random() - 0.5) * 0.15);

    ctx.font = `900 ${Math.floor(handRadius * 3.5 * scale)}px "Noto Sans JP", "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const alpha = scale * (0.6 + Math.random() * 0.4);
    
    // RGB Glitch/Chromatic Aberration shadow effect
    ctx.fillStyle = `rgba(0, 255, 255, ${alpha * 0.6})`; // Cyan
    ctx.fillText("死", -3 * scale, 3 * scale);
    ctx.fillStyle = `rgba(255, 0, 50, ${alpha * 0.6})`;  // Neon Red
    ctx.fillText("死", 3 * scale, -3 * scale);

    // Main Kanji: Deep blood red core with a thick, violent black stroke
    ctx.fillStyle = `rgba(180, 0, 0, ${alpha})`;
    ctx.strokeStyle = `rgba(5, 5, 5, ${alpha})`;
    ctx.lineWidth = 4.5 * scale;
    
    ctx.strokeText("死", 0, 0);
    ctx.fillText("死", 0, 0);
    
    ctx.restore();
  }
}
