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
  // 1. DRAW CAPE (Authentic Pixel-Art Hero Cape & Collar Buttons)
  // ─────────────────────────────────────────────
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

  drawSaitamaPixelCape(ctx, r, inertiaX, inertiaY, gentleSway1, gentleSway2, waveRipple, false);

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
  // 4. MAIN CIRCLE BODY (AUTHENTIC PIXEL ART MODEL)
  // ─────────────────────────────────────────────
  drawSaitamaPixelBody(ctx, r, false);

  // ── Render Front Hand (Front Layer - On Top of Body Circle) ──
  if (!shouldHideHands && !fighter.hideFrontHand) {
    const isPunchHandFront = isFlurrying ? true : fighter.isRightPunch;
    if (isChargingAny && isPunchHandFront) {
      drawSeriousChargeGlow(ctx, frontHandX, frontHandY, handRadius, chargeScale);
    }
    if (isFlurrying) {
      drawSaitamaArm(ctx, r, frontHandX, frontHandY, handRadius, r * 0.28, true);
    } else {
      // Crisp stepped pixel-art brawler glove
      drawSaitamaPixelGlove(ctx, frontHandX, frontHandY, handRadius);
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
/**
 * Draws an authentic stepped pixel-art red brawler glove for Saitama.
 */
function drawSaitamaPixelGlove(ctx, handX, handY, handRadius, alpha = 1.0) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.globalAlpha = alpha;

  const P = 2.0;
  const gridR = Math.max(P * 2, handRadius);
  const steps = Math.ceil(gridR / P);

  // 1. Dark Manga Ink Outline Shell
  ctx.fillStyle = '#0E0F14';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= gridR + P * 0.75) {
        ctx.fillRect(Math.round(handX + gx * P), Math.round(handY + gy * P), P, P);
      }
    }
  }

  // 2. Base Red Glove Body (#C80000)
  ctx.fillStyle = '#C80000';
  const innerR = gridR - P * 0.4;
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR) {
        ctx.fillRect(Math.round(handX + gx * P), Math.round(handY + gy * P), P, P);
      }
    }
  }

  // 3. Dark Crimson Shading Blocks on bottom/heel
  ctx.fillStyle = '#8A0000';
  for (let gy = 0; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR && (gy * P > innerR * 0.35 || gx * P < -innerR * 0.45)) {
        ctx.fillRect(Math.round(handX + gx * P), Math.round(handY + gy * P), P, P);
      }
    }
  }

  // 4. Specular Knuckle Highlight Pixels
  ctx.fillStyle = '#FF9999';
  const hx = Math.round(handX + P * 0.5);
  const hy = Math.round(handY - innerR * 0.45);
  ctx.fillRect(hx, hy, P, P);
  ctx.fillRect(hx + P, hy, P, P);

  ctx.restore();
}

/**
 * Draws a punching arm with yellow hero suit sleeve and red glove (Pixel Art)
 */
function drawSaitamaArm(ctx, r, handX, handY, handRadius, shoulderY, isFront = false) {
  ctx.save();
  
  // 1. Pixel-Art Arm Sleeve extending from torso to glove
  const startX = r * 0.15;
  const startY = shoulderY;
  const endX = handX;
  const endY = handY;

  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.hypot(dx, dy);

  if (dist > handRadius * 0.4) {
    const P = 2.0;
    const snap = (v) => Math.round(v / P) * P;
    const angle = Math.atan2(dy, dx);
    const perpAngle = angle + Math.PI / 2;
    const sleeveW = handRadius * 0.72;
    const px = Math.cos(perpAngle) * sleeveW;
    const py = Math.sin(perpAngle) * sleeveW;

    const sleevePts = [
      { x: startX + px * 0.75, y: startY + py * 0.75 },
      { x: endX - Math.cos(angle) * (handRadius * 0.3) + px, y: endY - Math.sin(angle) * (handRadius * 0.3) + py },
      { x: endX - Math.cos(angle) * (handRadius * 0.3) - px, y: endY - Math.sin(angle) * (handRadius * 0.3) - py },
      { x: startX - px * 0.75, y: startY - py * 0.75 }
    ];

    // Stepped pixel outline
    ctx.fillStyle = '#111114';
    for (let j = 0; j < sleevePts.length; j++) {
      const p1 = sleevePts[j];
      const p2 = sleevePts[(j + 1) % sleevePts.length];
      const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const steps = Math.max(2, Math.round(len / P));
      for (let st = 0; st <= steps; st++) {
        const rx = p1.x + (p2.x - p1.x) * (st / steps);
        const ry = p1.y + (p2.y - p1.y) * (st / steps);
        ctx.fillRect(snap(rx) - P * 0.5, snap(ry) - P * 0.5, P * 2, P * 2);
      }
    }

    // Stepped pixel sleeve fill
    ctx.fillStyle = '#FFEB94';
    ctx.beginPath();
    sleevePts.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(snap(pt.x), snap(pt.y));
      else ctx.lineTo(snap(pt.x), snap(pt.y));
    });
    ctx.closePath();
    ctx.fill();
  }

  // 2. Stepped Pixel-Art Red Glove
  drawSaitamaPixelGlove(ctx, handX, handY, handRadius);

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

    // 1. Pixel-Art Arm Sleeve Streak connecting from body to punching glove
    const P = 2.0;
    const snap = (v) => Math.round(v / P) * P;
    const perpY = handRadius * 0.55;
    const sleevePts = [
      { x: r * 0.25, y: fistY * 0.5 - perpY * 0.6 },
      { x: fistX - fRadius * 0.4, y: fistY - perpY },
      { x: fistX - fRadius * 0.4, y: fistY + perpY },
      { x: r * 0.25, y: fistY * 0.5 + perpY * 0.6 }
    ];

    // Stepped pixel outline
    ctx.fillStyle = '#111114';
    for (let j = 0; j < sleevePts.length; j++) {
      const p1 = sleevePts[j];
      const p2 = sleevePts[(j + 1) % sleevePts.length];
      const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const steps = Math.max(2, Math.round(len / P));
      for (let st = 0; st <= steps; st++) {
        const rx = p1.x + (p2.x - p1.x) * (st / steps);
        const ry = p1.y + (p2.y - p1.y) * (st / steps);
        ctx.fillRect(snap(rx) - P * 0.5, snap(ry) - P * 0.5, P * 2, P * 2);
      }
    }

    // Stepped pixel sleeve fill
    ctx.fillStyle = 'rgba(255, 235, 148, 0.85)';
    ctx.beginPath();
    sleevePts.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(snap(pt.x), snap(pt.y));
      else ctx.lineTo(snap(pt.x), snap(pt.y));
    });
    ctx.closePath();
    ctx.fill();

    // 2. Forward punch wind / motion blur speed lines (only while thrusting forward)
    if (forwardVel > 0) {
      ctx.fillStyle = '#FFFFFF';
      for (let st = 0; st <= 6; st++) {
        const sx = fistX - fRadius * 1.3 + (st / 6) * (fRadius * 2.1);
        const sy1 = fistY - fRadius * 0.8 + (st / 6) * (fRadius * 0.8);
        const sy2 = fistY + fRadius * 0.8 - (st / 6) * (fRadius * 0.8);
        ctx.fillRect(snap(sx), snap(sy1), P, P);
        ctx.fillRect(snap(sx), snap(sy2), P, P);
      }

      // Golden concussive pressure ring at tip (Pixel Art)
      ctx.fillStyle = 'rgba(255, 220, 80, 0.9)';
      for (let a = -Math.PI * 0.45; a <= Math.PI * 0.45; a += 0.2) {
        const rx = fistX + Math.cos(a) * (fRadius + 3);
        const ry = fistY + Math.sin(a) * (fRadius + 3);
        ctx.fillRect(snap(rx), snap(ry), P, P);
      }
    }

    // 3. Stepped Pixel-Art Ghost Red Glove
    drawSaitamaPixelGlove(ctx, fistX, fistY, fRadius, alpha);

    ctx.restore();
  }
  ctx.restore();
}

/**
 * Helper to compute cubic bezier point
 */
function cubicBezierPt(p0, p1, p2, p3, t) {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
  };
}

/**
 * Helper to compute quadratic bezier point
 */
function quadBezierPt(p0, p1, p2, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
  };
}

/**
 * Draws Saitama's entire body circle model in authentic Pixel Art Style.
 * Minimalist circle brawler aesthetic, upright front POV, faceless (Rule #19 compliant).
 */
function drawSaitamaPixelBody(ctx, r, isGhost = false) {
  ctx.save();
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  // 1. Dark Manga Ink Outline Shell (#111114)
  ctx.fillStyle = isGhost ? '#111114' : '#0E0F14';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= r + P * 0.85) {
        ctx.fillRect(snap(gx * P), snap(gy * P), P, P);
      }
    }
  }

  // 2. Stepped Pixel Fill by Zone
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);

      // Zone A: Top Bald Head Skin Section (ry < -r * 0.35)
      if (ry < -r * 0.35) {
        let col = '#FFE0BD';
        if (ry < -r * 0.70 && Math.abs(rx) < r * 0.45) {
          col = '#FFF2E0'; // Top bald shine highlight
        } else if (ry > -r * 0.45 || Math.abs(rx) > r * 0.75) {
          col = '#F2C8A4'; // Chin / cheek shadow
        }
        ctx.fillStyle = col;
        ctx.fillRect(px, py, P, P);
      }
      // Zone B: Yellow Hero Suit Upper & Lower (-r * 0.35 <= ry < r * 0.25)
      else if (ry < r * 0.25) {
        // Golden zipper pull tab at center
        if (Math.abs(rx) < P * 0.8 && ry >= -r * 0.35 && ry <= -r * 0.05) {
          if (ry <= -r * 0.25) {
            ctx.fillStyle = '#C88A00'; // Zipper ring
          } else {
            ctx.fillStyle = '#FFFFFF'; // White zipper line
          }
        } else {
          let col = '#FFEB94';
          if (ry < -r * 0.10 && Math.abs(rx) < r * 0.50) {
            col = '#FFF5B8'; // Chest highlight
          } else if (Math.abs(rx) > r * 0.75 || ry > r * 0.16) {
            col = '#E8CA65'; // Suit shadow / wrinkle
          }
          ctx.fillStyle = col;
        }
        ctx.fillRect(px, py, P, P);
      }
      // Zone C: Horizontal Black Hero Belt & Buckle (r * 0.25 <= ry < r * 0.55)
      else if (ry < r * 0.55) {
        // Center Golden Buckle
        const isBuckle = (Math.abs(rx) <= r * 0.28 && Math.abs(ry - r * 0.38) <= r * 0.12);
        if (isBuckle) {
          if (Math.abs(rx) >= r * 0.24 || Math.abs(ry - r * 0.38) >= r * 0.10) {
            ctx.fillStyle = '#111114'; // Buckle border
          } else if (rx < -P && ry < r * 0.38) {
            ctx.fillStyle = '#FFF5A0'; // Metallic buckle glint
          } else {
            ctx.fillStyle = '#F5C400'; // Golden buckle plate
          }
        } else {
          // Belt leather
          ctx.fillStyle = (ry < r * 0.30) ? '#282832' : '#111114';
        }
        ctx.fillRect(px, py, P, P);
      }
      // Zone D: Crimson Red Boots / Lower Suit (ry >= r * 0.55)
      else {
        let col = '#C80000';
        if (ry < r * 0.65 && Math.abs(rx) < r * 0.45) {
          col = '#E52E2E'; // Top boot rim highlight
        } else if (ry > r * 0.82 || Math.abs(rx) > r * 0.70) {
          col = '#8A0000'; // Boot heel / edge shadow
        }
        ctx.fillStyle = col;
        ctx.fillRect(px, py, P, P);
      }
    }
  }

  ctx.restore();
}

/**
 * Draws Saitama's iconic hero white cape in authentic Pixel Art Style
 */
function drawSaitamaPixelCape(ctx, r, inertiaX = 0, inertiaY = 0, gentleSway1 = 0, gentleSway2 = 0, waveRipple = 0, isGhost = false) {
  ctx.save();
  const P = 2.0; // Stepped pixel grid size
  const snap = (v) => Math.round(v / P) * P;

  // Cape Attachment / Collar Button Positions (Back of shoulders)
  const topAttach = { x: -r * 0.35, y: -r * 0.35 };
  const botAttach = { x: -r * 0.35, y: -r * 0.05 };

  // Outer Cape Boundary Points (Flowing backwards into -X)
  const topCapeTip = {
    x: -r * 1.85 + inertiaX * 0.8 + gentleSway1,
    y: -r * 0.85 + inertiaY * 0.6 - gentleSway2
  };
  const midCapeFold = {
    x: -r * 2.10 + inertiaX * 1.0 + gentleSway2,
    y: 0 + inertiaY * 0.8 + waveRipple
  };
  const botCapeTip = {
    x: -r * 1.75 + inertiaX * 0.8 - gentleSway1,
    y: r * 0.75 + inertiaY * 0.6 + gentleSway2
  };

  // Sample boundary perimeter vertices into stepped pixel points
  const poly = [];
  const N = 20;

  // 1. Top curve: topAttach -> topCapeTip
  const c1Top = { x: -r * 0.95 + inertiaX * 0.4, y: -r * 0.65 + inertiaY * 0.3 + gentleSway1 };
  const c2Top = { x: -r * 1.45 + inertiaX * 0.7 + gentleSway2, y: -r * 0.90 + inertiaY * 0.5 + waveRipple };
  for (let i = 0; i <= N; i++) {
    poly.push(cubicBezierPt(topAttach, c1Top, c2Top, topCapeTip, i / N));
  }

  // 2. Trailing edge: topCapeTip -> midCapeFold -> botCapeTip
  const cMid1 = { x: -r * 1.95 + inertiaX * 0.9 + gentleSway2, y: -r * 0.40 + inertiaY * 0.7 };
  const cMid2 = { x: -r * 1.90 + inertiaX * 0.8 - gentleSway1, y: r * 0.40 + inertiaY * 0.7 };
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    if (t <= 0.5) {
      poly.push(quadBezierPt(topCapeTip, cMid1, midCapeFold, t * 2));
    } else {
      poly.push(quadBezierPt(midCapeFold, cMid2, botCapeTip, (t - 0.5) * 2));
    }
  }

  // 3. Bottom curve: botCapeTip -> botAttach
  const c1Bot = { x: -r * 1.35 + inertiaX * 0.6 - gentleSway2, y: r * 0.55 + inertiaY * 0.4 - waveRipple };
  const c2Bot = { x: -r * 0.75 + inertiaX * 0.3, y: r * 0.20 + inertiaY * 0.2 };
  for (let i = 1; i <= N; i++) {
    poly.push(cubicBezierPt(botCapeTip, c1Bot, c2Bot, botAttach, i / N));
  }

  // Pass 1: Outer Dark Pixel Outline Shell (#111114)
  ctx.fillStyle = '#111114';
  for (let j = 0; j < poly.length; j++) {
    const p1 = poly[j];
    const p2 = poly[(j + 1) % poly.length];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(2, Math.round(dist / P));
    for (let st = 0; st <= steps; st++) {
      const rx = p1.x + (p2.x - p1.x) * (st / steps);
      const ry = p1.y + (p2.y - p1.y) * (st / steps);
      ctx.fillRect(snap(rx) - P * 0.5, snap(ry) - P * 0.5, P * 2, P * 2);
    }
  }

  // Pass 2: Base White Pixel Cape Body (#FFFFFF / #F6F4FA)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  poly.forEach((pt, idx) => {
    const px = snap(pt.x);
    const py = snap(pt.y);
    if (idx === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.fill();

  // Pass 3: 3D Depth Shadow Pixels along lower wing / underfolds
  ctx.fillStyle = isGhost ? 'rgba(200, 195, 215, 0.6)' : '#DCD8E6';
  ctx.beginPath();
  const shadowStartIdx = Math.floor(poly.length * 0.38);
  const shadowEndIdx = Math.floor(poly.length * 0.85);
  ctx.moveTo(snap(poly[shadowStartIdx].x), snap(poly[shadowStartIdx].y));
  for (let k = shadowStartIdx; k <= shadowEndIdx; k++) {
    ctx.lineTo(snap(poly[k].x), snap(poly[k].y));
  }
  ctx.lineTo(snap(-r * 0.95), snap(r * 0.15));
  ctx.closePath();
  ctx.fill();

  // Pass 4: Stepped Pixel Fold Creases
  const drawPixelCrease = (fromPt, ctrlPt1, ctrlPt2, toPt, color) => {
    ctx.fillStyle = color;
    const steps = 14;
    for (let s = 0; s <= steps; s++) {
      const pt = cubicBezierPt(fromPt, ctrlPt1, ctrlPt2, toPt, s / steps);
      ctx.fillRect(snap(pt.x), snap(pt.y), P, P);
    }
  };

  const foldCol = isGhost ? 'rgba(180, 175, 195, 0.7)' : '#C8C2D4';
  // Upper fold crease
  drawPixelCrease(
    topAttach,
    { x: -r * 0.80 + inertiaX * 0.3, y: -r * 0.45 + gentleSway1 },
    { x: -r * 1.30 + inertiaX * 0.6, y: -r * 0.30 + waveRipple },
    { x: midCapeFold.x + r * 0.20, y: midCapeFold.y - r * 0.20 },
    foldCol
  );
  // Lower fold crease
  drawPixelCrease(
    botAttach,
    { x: -r * 0.70 + inertiaX * 0.3, y: r * 0.10 - gentleSway2 },
    { x: -r * 1.20 + inertiaX * 0.5, y: r * 0.30 + waveRipple },
    { x: botCapeTip.x + r * 0.20, y: botCapeTip.y - r * 0.10 },
    foldCol
  );

  // Pass 5: Stepped Pixel Cape Collar Buttons
  const drawPixelCollarButton = (bx, by) => {
    const cx = snap(bx);
    const cy = snap(by);
    const btnR = snap(r * 0.12);
    const steps = Math.ceil(btnR / P);

    // Outline
    ctx.fillStyle = '#111114';
    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        if (Math.hypot(gx * P, gy * P) <= btnR + P * 0.5) {
          ctx.fillRect(cx + gx * P, cy + gy * P, P, P);
        }
      }
    }
    // Button Core
    ctx.fillStyle = '#222228';
    for (let gy = -steps; gy <= steps; gy++) {
      for (let gx = -steps; gx <= steps; gx++) {
        if (Math.hypot(gx * P, gy * P) <= btnR) {
          ctx.fillRect(cx + gx * P, cy + gy * P, P, P);
        }
      }
    }
    // Specular Glint
    ctx.fillStyle = '#AAAAAA';
    ctx.fillRect(cx - P, cy - P, P, P);
  };

  drawPixelCollarButton(topAttach.x, topAttach.y);
  drawPixelCollarButton(botAttach.x, botAttach.y);

  ctx.restore();
}

/**
 * Draws a full Saitama model ghost skin afterimage
 */
function drawSaitamaGhostModel(ctx, r) {
  // 1. Cape (Pixel Art)
  drawSaitamaPixelCape(ctx, r, 0, 0, 0, 0, 0, true);

  // 2. Hands (Back & Front - Pixel Art)
  const handRadius = Math.max(r * 0.38, 8.5);
  const backHandX = 0, backHandY = -r * 0.15;

  // Back Hand
  drawSaitamaPixelGlove(ctx, backHandX, backHandY, handRadius);

  // 3. Body Circle (Pixel Art)
  drawSaitamaPixelBody(ctx, r, true);

  // Front Hand (Pixel Art)
  const frontHandX = r * 0.95, frontHandY = 0;
  drawSaitamaPixelGlove(ctx, frontHandX, frontHandY, handRadius);

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
