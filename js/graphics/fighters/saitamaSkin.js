import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { isSuppressedByGetsuga } from '../../entities/fighter.js';

// ─── Saitama Red Glove Sprite Asset Loader (Assets/model/Sprites/Glove-punch.png) ───
let _saitamaGloveSpriteImage = null;
let _saitamaGloveSpriteCanvas = null;
let _saitamaGloveSpriteLoading = false;

export function _getSaitamaGloveSpriteCanvas() {
  if (_saitamaGloveSpriteCanvas) {
    return _saitamaGloveSpriteCanvas;
  }
  if (_saitamaGloveSpriteImage && _saitamaGloveSpriteImage.complete && _saitamaGloveSpriteImage.naturalWidth > 0) {
    if (typeof document !== 'undefined') {
      try {
        const nw = _saitamaGloveSpriteImage.naturalWidth;
        const nh = _saitamaGloveSpriteImage.naturalHeight;
        const offCanvas = document.createElement('canvas');
        offCanvas.width = nw;
        offCanvas.height = nh;
        const offCtx = offCanvas.getContext('2d');
        offCtx.imageSmoothingEnabled = false;
        offCtx.drawImage(_saitamaGloveSpriteImage, 0, 0);

        // Alpha Cut: Remove solid white / light background pixels (R, G, B > 230)
        const imgData = offCtx.getImageData(0, 0, nw, nh);
        const data = imgData.data;
        let minX = nw, minY = nh, maxX = 0, maxY = 0;
        let hasForeground = false;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a === 0 || (r > 230 && g > 230 && b > 230)) {
            data[i + 3] = 0;
          } else {
            const pixelIdx = i / 4;
            const px = pixelIdx % nw;
            const py = Math.floor(pixelIdx / nw);
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
            hasForeground = true;
          }
        }
        offCtx.putImageData(imgData, 0, 0);

        if (hasForeground && maxX >= minX && maxY >= minY) {
          const trimW = maxX - minX + 1;
          const trimH = maxY - minY + 1;
          const trimmedCanvas = document.createElement('canvas');
          trimmedCanvas.width = trimW;
          trimmedCanvas.height = trimH;
          const trimCtx = trimmedCanvas.getContext('2d');
          trimCtx.imageSmoothingEnabled = false;
          trimCtx.drawImage(offCanvas, minX, minY, trimW, trimH, 0, 0, trimW, trimH);
          _saitamaGloveSpriteCanvas = trimmedCanvas;
          return _saitamaGloveSpriteCanvas;
        }

        _saitamaGloveSpriteCanvas = offCanvas;
        return _saitamaGloveSpriteCanvas;
      } catch (e) {
        console.warn('Failed to process Saitama glove sprite canvas', e);
        return null;
      }
    }
  }

  if (!_saitamaGloveSpriteLoading && typeof Image !== 'undefined') {
    _saitamaGloveSpriteLoading = true;
    const img = new Image();
    img.onload = () => {
      _saitamaGloveSpriteImage = img;
      _saitamaGloveSpriteLoading = false;
      _getSaitamaGloveSpriteCanvas();
    };
    img.onerror = (e) => {
      console.warn('Failed to load Saitama glove sprite at Assets/model/Sprites/Glove-punch.png', e);
      _saitamaGloveSpriteLoading = false;
    };
    img.src = 'Assets/model/Sprites/Glove-punch.png?v=1';
    _saitamaGloveSpriteImage = img;
  }
  return _saitamaGloveSpriteCanvas;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getSaitamaGloveSpriteCanvas();
}

/**
 * Visual Skin Renderer for Saitama (The Caped Baldy)
 * Recreated precisely matching Yuji/Todo punch animation standards & anime flowing cape folds.
 */
export function drawSaitamaSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const now = Date.now();

  // 0. Draw afterimages (Teleport / sidestep ghost model skin) at their absolute coordinates
  const isSuppressed = typeof fighter.areAttackEffectsSuppressed === 'function' ? fighter.areAttackEffectsSuppressed() : isSuppressedByGetsuga(fighter);
  if (fighter.afterImages && fighter.afterImages.length > 0 && !isSuppressed) {
    ctx.save();
    for (let i = 0; i < fighter.afterImages.length; i++) {
      const ai = fighter.afterImages[i];
      if (!ai || ai.timer <= 0) continue;
      const progress = ai.timer / (ai.maxTimer || 10);
      const baseAlpha = ai.alpha !== undefined ? ai.alpha : 0.38;
      const alpha = progress * baseAlpha;
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
  const isFlurryFinalPunch = !isPodiumPreview && Boolean(fighter._flurryFinalPunchTimer && fighter._flurryFinalPunchTimer > 0);
  const isPunching = isNormalPunching || isPostCounter || isFlurrying || isFlurryFinalPunch;

  let rawProgress = 0;
  let easePunch = 0;
  if (isPunching) {
    if (isFlurryFinalPunch) {
      // Consecutive Normal Punches Final Slam: Matches Serious Counter Punch animation dynamics (+3.40r reach)
      const maxFinalT = (typeof CONFIG !== 'undefined' && CONFIG.saitama?.flurryFinalPunchRecoveryFrames) || 45;
      const p = Math.min(1.0, Math.max(0.0, 1.0 - (fighter._flurryFinalPunchTimer / maxFinalT)));
      const thrustT = Math.min(1.0, p / 0.08); // Hyper-explosive snap in first ~5 frames
      const easeThrust = 1.0 - Math.pow(1.0 - thrustT, 4);
      easePunch = easeThrust + p * 0.45; // forward cruising drift
      rawProgress = p;
    } else if (isFlurrying) {
      // 4-frame fast alternating flurry cycle
      const cycleFrame = (fighter.flurryTimer || 0) % 4;
      rawProgress = cycleFrame / 4;
      easePunch = Math.sin(rawProgress * Math.PI);
    } else if (isPostCounter) {
      // Serious Skill Counter Punch: Blistering hypersonic warp launch (+3.40r) cutting across the arena (One-Shot Kill Presence)
      const maxRec = (typeof CONFIG !== 'undefined' && CONFIG.saitama?.counterPunchRecoveryFrames) || 65;
      const p = Math.min(1.0, Math.max(0.0, 1.0 - (fighter._postCounterRecoveryTimer / maxRec)));
      const thrustT = Math.min(1.0, p / 0.08); // Hyper-explosive snap in first ~5 frames
      const easeThrust = 1.0 - Math.pow(1.0 - thrustT, 4);
      easePunch = easeThrust + p * 0.45; // forward cruising drift
      rawProgress = p;
    } else if (isNormalPunching) {
      // Normal Punch: Snappy forward punch thrust (+2.10r) drifting forward and fading out in the air (NEVER pulled back)
      const maxT = fighter.punchActiveMaxTime || fighter.punchMaxTime || (typeof CONFIG !== 'undefined' && CONFIG.saitama?.punchMaxTime) || 28;
      rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
      const thrustT = Math.min(1.0, rawProgress / 0.28);
      const easeThrust = 1.0 - Math.pow(1.0 - thrustT, 3);
      easePunch = easeThrust + rawProgress * 0.25;
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
    backHandY = r * 0.12 + Math.cos(t * cycleFreq) * (r * 0.06);

    // Front Hand (Left Arm): In exact opposite anti-phase (+ PI)
    const stroke2 = (Math.sin(t * cycleFreq + Math.PI) + 1) / 2; // 1.0 -> 0.0 -> 1.0
    frontHandX = -r * 0.20 + stroke2 * (r * 2.45);
    frontHandY = r * 0.40 - Math.cos(t * cycleFreq) * (r * 0.06);
  } else if (isFlurryFinalPunch || isPostCounter) {
    // Serious Counter & Flurry Final Slam: Glove snaps cleanly from cocked core position to forward strike guard
    const ext = Math.min(1.0, easePunch);
    frontHandX = r * 0.95 + ext * (r * 0.15);
    frontHandY = r * 0.25;
    backHandX  = -r * 0.25;
    backHandY  = r * 0.25;
  } else if (isNormalPunching) {
    // Normal Punch: Crisp forward jab at body perimeter
    frontHandX = r * 0.95 + Math.min(1.0, easePunch) * (r * 0.15);
    frontHandY = r * 0.25;
    backHandX  = -r * 0.25;
    backHandY  = r * 0.25;
  } else if (isPunching) {
    // All punches executed with the front hand at the right edge
    frontHandX = r * 0.95;
    frontHandY = r * 0.25;
    backHandX  = 0; backHandY  = 0;
  } else {
    // Idle brawler guard stance: front hand at the right edge of body circle lowered to chest level
    frontHandX = r * 0.95;
    frontHandY = r * 0.25;
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
    const targetY = r * 0.25;
    
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
    drawSaitamaPixelGlove(ctx, r * 0.35, r * 0.15, handRadius);
  }

  // ─────────────────────────────────────────────
  // 4. MAIN CIRCLE BODY (AUTHENTIC PIXEL ART MODEL)
  // ─────────────────────────────────────────────
  drawSaitamaPixelBody(ctx, r, false);

  // ── Render Front Hand (Front Layer - On Top of Body Circle) ──
  if (!shouldHideHands && !fighter.hideFrontHand) {
    const isPunchHandFront = (isFlurrying || isFlurryFinalPunch || isPostCounter || isNormalPunching) ? true : fighter.isRightPunch;
    if (isChargingAny && isPunchHandFront) {
      drawSeriousChargeGlow(ctx, frontHandX, frontHandY, handRadius, chargeScale);
    }
    if (isFlurrying) {
      drawSaitamaPixelGlove(ctx, r * 0.35, r * 0.40, handRadius);
    } else {
      // Drawn pixel-art glove cleanly at frontHand position
      drawSaitamaPixelGlove(ctx, frontHandX, frontHandY, handRadius);
    }
  }

  // ── Consecutive Normal Punches: Multi-Fist Barrage (Anime Ghost Fists) ──
  if (isFlurrying && !shouldHideHands) {
    drawConsecutivePunchesBarrage(ctx, r, handRadius, fighter.flurryTimer || 0, fighter);
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

  // ─────────────────────────────────────────────
  // 5. FLOATING PUNCH PROJECTILE & SHOCKWAVES (WORLD SPACE)
  // Decoupled from Saitama's body coordinates so moving/rotating does not pivot or drag the released punch!
  // ─────────────────────────────────────────────
  if (!shouldHideHands) {
    if (isPostCounter) {
      const counterScale = (typeof CONFIG !== 'undefined' && CONFIG.saitama?.counterPunchSpriteScale) || 3.40;
      // Explosive forced-perspective scaling pop: starts at 1.8x and bursts instantly to full 3.40x
      const thrustT = Math.min(1.0, rawProgress / 0.08);
      const easeThrust = 1.0 - Math.pow(1.0 - thrustT, 4);
      const currentScale = 1.80 + easeThrust * (counterScale - 1.80);

      // Punch holds solid full opacity through the explosive blast, then dissolves in distant air
      const punchAlpha = rawProgress < 0.50 ? 1.0 : Math.max(0.0, 1.0 - (rawProgress - 0.50) / 0.50);

      const releaseOriginX = fighter._counterReleaseOriginX !== undefined ? fighter._counterReleaseOriginX : fighter.x;
      const releaseOriginY = fighter._counterReleaseOriginY !== undefined ? fighter._counterReleaseOriginY : (fighter.y - (fighter.z || 0));
      const releaseAngle = fighter._counterReleaseAngle !== undefined ? fighter._counterReleaseAngle : (fighter.gunAngle || fighter.angle || 0);
      const releaseFacingLeft = Math.abs(releaseAngle) > Math.PI / 2;

      const punchReach = r * 0.95 + easePunch * (r * 3.40);
      const punchLateral = r * 0.20;

      ctx.save();
      ctx.translate(releaseOriginX, releaseOriginY);
      ctx.rotate(releaseAngle);
      if (releaseFacingLeft) ctx.scale(1, -1);

      // Supersonic Manga Shockwave Blast & Conical Air-Blast VFX (One-Shot Death Punch)
      if (punchAlpha > 0.05) {
        drawSeriousCounterImpactVFX(ctx, r, punchReach, punchLateral, handRadius * currentScale, rawProgress, punchAlpha);
      }
      if (punchAlpha > 0.01) {
        drawSaitamaGloveSprite(ctx, punchReach, punchLateral, handRadius * currentScale, punchAlpha, currentScale);
      }
      ctx.restore();
    } else if (isFlurryFinalPunch) {
      const finalScale = (typeof CONFIG !== 'undefined' && CONFIG.saitama?.flurryFinalPunchSpriteScale) || 3.40;
      // Explosive forced-perspective scaling pop: starts at 1.8x and bursts instantly to full 3.40x (matches Serious Counter)
      const thrustT = Math.min(1.0, rawProgress / 0.08);
      const easeThrust = 1.0 - Math.pow(1.0 - thrustT, 4);
      const currentScale = 1.80 + easeThrust * (finalScale - 1.80);

      // Punch holds solid full opacity through the explosive blast, then dissolves in distant air
      const punchAlpha = rawProgress < 0.50 ? 1.0 : Math.max(0.0, 1.0 - (rawProgress - 0.50) / 0.50);

      const releaseOriginX = fighter._flurryFinalPunchReleaseOriginX !== undefined ? fighter._flurryFinalPunchReleaseOriginX : fighter.x;
      const releaseOriginY = fighter._flurryFinalPunchReleaseOriginY !== undefined ? fighter._flurryFinalPunchReleaseOriginY : (fighter.y - (fighter.z || 0));
      const releaseAngle = fighter._flurryFinalPunchReleaseAngle !== undefined ? fighter._flurryFinalPunchReleaseAngle : (fighter.gunAngle || fighter.angle || 0);
      const releaseFacingLeft = Math.abs(releaseAngle) > Math.PI / 2;

      const punchReach = r * 0.95 + easePunch * (r * 3.40);
      const punchLateral = r * 0.20;

      ctx.save();
      ctx.translate(releaseOriginX, releaseOriginY);
      ctx.rotate(releaseAngle);
      if (releaseFacingLeft) ctx.scale(1, -1);

      // Supersonic Manga Concussive Pressure Rings & Impact VFX (One-Shot Death Punch Style)
      if (punchAlpha > 0.05) {
        drawSeriousCounterImpactVFX(ctx, r, punchReach, punchLateral, handRadius * currentScale, rawProgress, punchAlpha);
      }
      if (punchAlpha > 0.01) {
        drawSaitamaGloveSprite(ctx, punchReach, punchLateral, handRadius * currentScale, punchAlpha, currentScale);
      }
      ctx.restore();
    } else if (isNormalPunching) {
      const normalScale = (typeof CONFIG !== 'undefined' && CONFIG.saitama?.normalPunchSpriteScale) || 1.65;
      const currentScale = 1.0 + Math.min(1.0, easePunch) * (normalScale - 1.0);
      // Floating Normal Punch Glove Sprite fades away smoothly out in the air as it travels forward (never pulling back)
      const punchAlpha = rawProgress < 0.38 ? 1.0 : Math.max(0.0, 1.0 - (rawProgress - 0.38) / 0.62);

      const releaseOriginX = fighter._normalPunchReleaseOriginX !== undefined ? fighter._normalPunchReleaseOriginX : fighter.x;
      const releaseOriginY = fighter._normalPunchReleaseOriginY !== undefined ? fighter._normalPunchReleaseOriginY : (fighter.y - (fighter.z || 0));
      const releaseAngle = fighter._normalPunchReleaseAngle !== undefined ? fighter._normalPunchReleaseAngle : (fighter.gunAngle || fighter.angle || 0);
      const releaseFacingLeft = Math.abs(releaseAngle) > Math.PI / 2;

      const punchReach = r * 0.95 + easePunch * (r * 2.10);
      const punchLateral = r * 0.25;

      ctx.save();
      ctx.translate(releaseOriginX, releaseOriginY);
      ctx.rotate(releaseAngle);
      if (releaseFacingLeft) ctx.scale(1, -1);

      if (punchAlpha > 0.01) {
        drawSaitamaGloveSprite(ctx, punchReach, punchLateral, handRadius * currentScale, punchAlpha, currentScale);
      }
      ctx.restore();
    }
  }
}

/**
 * Draws a punching arm sleeve with yellow hero suit fabric (Pixel Art)
 */
export function drawSaitamaArmSleeve(ctx, r, startX, startY, endX, endY, sleeveRadius) {
  const dx = endX - startX;
  const dy = endY - startY;
  const dist = Math.hypot(dx, dy);

  // Hard distance limit: never stretch like rubber across open space
  if (dist <= sleeveRadius * 0.3 || dist > r * 2.2) return;

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const angle = Math.atan2(dy, dx);
  const perpAngle = angle + Math.PI / 2;
  const sleeveW = sleeveRadius * 0.72;
  const px = Math.cos(perpAngle) * sleeveW;
  const py = Math.sin(perpAngle) * sleeveW;

  const sleevePts = [
    { x: startX + px * 0.75, y: startY + py * 0.75 },
    { x: endX - Math.cos(angle) * (sleeveRadius * 0.3) + px, y: endY - Math.sin(angle) * (sleeveRadius * 0.3) + py },
    { x: endX - Math.cos(angle) * (sleeveRadius * 0.3) - px, y: endY - Math.sin(angle) * (sleeveRadius * 0.3) - py },
    { x: startX - px * 0.75, y: startY - py * 0.75 }
  ];

  ctx.save();
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
  ctx.restore();
}

/**
 * Draws epic supersonic concussive pressure rings and impact stars
 * for Saitama's one-shot Serious Counter Death Punch & Flurry Finisher Slam.
 */
function drawSeriousCounterImpactVFX(ctx, r, fistX, fistY, fRadius, rawProgress, alpha = 1.0) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // 1. Dual Supersonic Concussive Pressure Rings expanding ahead of knuckles
  const ringOffsets = [fRadius * 0.30, fRadius * 0.65];
  ringOffsets.forEach((offset, idx) => {
    ctx.fillStyle = idx === 0 ? '#FFFFFF' : 'rgba(255, 230, 90, 0.95)';
    const ringThick = idx === 0 ? P * 1.5 : P;
    for (let a = -Math.PI * 0.46; a <= Math.PI * 0.46; a += 0.16) {
      const rx = fistX + Math.cos(a) * (fRadius + offset);
      const ry = fistY + Math.sin(a) * (fRadius + offset);
      ctx.fillRect(snap(rx), snap(ry), ringThick, ringThick);
    }
  });

  // 2. Radiant 4-Point Manga Impact Star on initial thrust explosion (rawProgress < 0.22)
  if (rawProgress < 0.22) {
    const starProg = rawProgress / 0.22;
    const starScale = Math.sin(starProg * Math.PI);
    const starR = fRadius * (1.2 + starScale * 1.2);
    
    ctx.save();
    ctx.translate(fistX + fRadius * 0.4, fistY);
    
    // White core diamond / star spikes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    // Horizontal blast spikes
    ctx.beginPath();
    ctx.moveTo(-starR * 1.4, 0);
    ctx.lineTo(0, -P * 2.5);
    ctx.lineTo(starR * 1.8, 0);
    ctx.lineTo(0, P * 2.5);
    ctx.closePath();
    ctx.fill();

    // Vertical blast spikes
    ctx.beginPath();
    ctx.moveTo(0, -starR * 1.3);
    ctx.lineTo(-P * 2.5, 0);
    ctx.lineTo(0, starR * 1.3);
    ctx.lineTo(P * 2.5, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
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
  const steps = Math.ceil((gridR + P) / P);

  // 100% 4-Way Symmetrical Glove Fill & Outer Border
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > gridR) continue;

      const px = handX + rx - P / 2;
      const py = handY + ry - P / 2;

      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > gridR ||
        Math.hypot((gx - 1) * P, gy * P) > gridR ||
        Math.hypot(gx * P, (gy + 1) * P) > gridR ||
        Math.hypot(gx * P, (gy - 1) * P) > gridR
      );

      if (isBorder) {
        ctx.fillStyle = '#0E0F14';
      } else if (gy * P > gridR * 0.35 || gx * P < -gridR * 0.45) {
        ctx.fillStyle = '#8A0000';
      } else {
        ctx.fillStyle = '#C80000';
      }
      ctx.fillRect(px, py, P, P);
    }
  }

  // Specular Knuckle Highlight Pixels
  ctx.fillStyle = '#FF9999';
  const hx = handX - P / 2;
  const hy = handY - gridR * 0.45 - P / 2;
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
  drawSaitamaArmSleeve(ctx, r, r * 0.15, shoulderY, handX, handY, handRadius);
  // 2. Stepped Pixel-Art Red Glove
  drawSaitamaPixelGlove(ctx, handX, handY, handRadius);
  ctx.restore();
}

/**
 * Draws the iconic multi-fist optical illusion barrage during Consecutive Normal Punches
 * Fists continuously animate back-and-forth in staggered phases.
 */
function drawConsecutivePunchesBarrage(ctx, r, handRadius, flurryTimer, fighter = null) {
  const isFinalHitPhase = Boolean(fighter && (fighter.flurryHitsLeft <= 2 || (fighter._flurryFinalPunchTimer && fighter._flurryFinalPunchTimer > 0)));
  const finalScale = (typeof CONFIG !== 'undefined' && CONFIG.saitama?.flurryFinalPunchSpriteScale) || 3.20;

  const lanes = [
    { y: -r * 0.70, phase: 0 },
    { y: -r * 0.40, phase: Math.PI * 0.66 },
    { y: -r * 0.10, phase: Math.PI * 1.33 },
    { y:  r * 0.20, phase: Math.PI * 0.33 },
    { y:  r * 0.50, phase: Math.PI * 1.0 },
    { y:  r * 0.80, phase: Math.PI * 1.66 }
  ];

  const cycleFreq = (Math.PI * 2) / 5; // ~5 frames per full forward/backward cycle
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  ctx.save();
  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    const curPhase = flurryTimer * cycleFreq + lane.phase;
    
    // Continuous back-and-forth stroke (0.0 = fully retracted, 1.0 = fully extended forward)
    const stroke = (Math.sin(curPhase) + 1) / 2; // 0.0 to 1.0
    const forwardVel = Math.cos(curPhase); // > 0 moving forward, < 0 pulling backward

    // Final punch scale multiplier: on final hit phase, the main central slam punch is significantly larger!
    const isMainFinisherLane = (i === 2 || i === 3);
    const scaleMult = (isFinalHitPhase && isMainFinisherLane) ? finalScale : 1.0;

    const reachMult = (isFinalHitPhase && isMainFinisherLane) ? (r * 3.35) : (r * 2.75);
    const fistX = -r * 0.10 + stroke * reachMult;
    const fistY = lane.y + Math.sin(curPhase * 0.5) * (r * 0.05);
    const fRadius = handRadius * (0.95 + stroke * 0.30) * scaleMult;
    const alpha = 0.40 + stroke * 0.55;

    // 1. Golden concussive pressure ring at tip (only while thrusting forward)
    if (forwardVel > 0) {
      ctx.fillStyle = (isFinalHitPhase && isMainFinisherLane) ? 'rgba(255, 240, 120, 0.95)' : 'rgba(255, 220, 80, 0.9)';
      const ringOffset = (isFinalHitPhase && isMainFinisherLane) ? 8 : 4;
      for (let a = -Math.PI * 0.45; a <= Math.PI * 0.45; a += 0.2) {
        const rx = fistX + Math.cos(a) * (fRadius + ringOffset);
        const ry = fistY + Math.sin(a) * (fRadius + ringOffset);
        ctx.fillRect(snap(rx), snap(ry), P, P);
      }
    }

    // 2. Authentic Floating Sprite Glove (Assets/model/Sprites/Glove-punch.png) with Procedural Fallback
    drawSaitamaGloveSprite(ctx, fistX, fistY, fRadius, alpha, scaleMult);
  }
  ctx.restore();
}

/**
 * Draws Saitama's authentic Glove-punch.png sprite (or stepped procedural fallback)
 */
export function drawSaitamaGloveSprite(ctx, fistX, fistY, fRadius, alpha = 1.0, scaleMultiplier = 1.0) {
  const spriteCanvas = _getSaitamaGloveSpriteCanvas();
  if (spriteCanvas && spriteCanvas.width > 0 && spriteCanvas.height > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = alpha;
    ctx.translate(fistX, fistY);
    ctx.rotate(Math.PI * 0.5); // Rotate 90 deg clockwise so knuckles point forward along +X
    const sw = spriteCanvas.width;
    const sh = spriteCanvas.height;
    const scale = (fRadius * 3.85) / sh;
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.drawImage(spriteCanvas, -dw * 0.5, -dh * 0.5, dw, dh);
    ctx.restore();
  } else {
    drawSaitamaPixelGlove(ctx, fistX, fistY, fRadius * 1.35, alpha);
  }
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
  const steps = Math.ceil((r + P) / P);

  // 100% 4-Way Symmetrical Circular Pixel Body Fill & Outer Border
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = rx - P / 2;
      const py = ry - P / 2;

      // Pixelated Black Stroke Border
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder) {
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // Zone A: Head & Face Skin Section (ry < r * 0.20)
      if (ry < r * 0.20) {
        let col = '#FFE0BD';
        if (ry < -r * 0.45 && Math.abs(rx) < r * 0.45) {
          col = '#FFF2E0'; // Top bald shine highlight
        } else if (Math.abs(rx) > r * 0.70) {
          col = '#F2C8A4'; // Side cheek / jaw shadow
        } else if (ry > r * 0.08) {
          col = '#E5B892'; // Lower neck shadow
        }
        ctx.fillStyle = col;
        ctx.fillRect(px, py, P, P);
      }
      // Zone B: Yellow Hero Suit (r * 0.20 <= ry < r * 0.62)
      else if (ry < r * 0.62) {
        // Golden zipper pull tab at center
        if (Math.abs(rx) < P * 0.8 && ry >= r * 0.20 && ry <= r * 0.42) {
          if (ry <= r * 0.26) {
            ctx.fillStyle = '#C88A00'; // Zipper ring
          } else {
            ctx.fillStyle = '#FFFFFF'; // White zipper line
          }
        } else {
          let col = '#FFEB94';
          if (ry < r * 0.38 && Math.abs(rx) < r * 0.45) {
            col = '#FFF5B8'; // Chest highlight
          } else if (Math.abs(rx) > r * 0.70 || ry > r * 0.54) {
            col = '#E8CA65'; // Suit shadow / wrinkle
          }
          ctx.fillStyle = col;
        }
        ctx.fillRect(px, py, P, P);
      }
      // Zone C: Horizontal Black Hero Belt & Golden Buckle (r * 0.62 <= ry < r * 0.76)
      else if (ry < r * 0.76) {
        // Center Golden Buckle
        const isBuckle = (Math.abs(rx) <= r * 0.26);
        if (isBuckle) {
          if (Math.abs(rx) >= r * 0.22 || Math.abs(ry - r * 0.69) >= r * 0.05) {
            ctx.fillStyle = '#111114'; // Buckle border
          } else if (rx < -P && ry < r * 0.69) {
            ctx.fillStyle = '#FFF5A0'; // Metallic buckle glint
          } else {
            ctx.fillStyle = '#F5C400'; // Golden buckle plate
          }
        } else {
          // Belt leather
          ctx.fillStyle = (ry < r * 0.69) ? '#282832' : '#111114';
        }
        ctx.fillRect(px, py, P, P);
      }
      // Zone D: Crimson Red Boots / Lower Suit (ry >= r * 0.76)
      else {
        let col = '#C80000';
        if (ry < r * 0.84 && Math.abs(rx) < r * 0.45) {
          col = '#E52E2E'; // Top boot rim highlight
        } else if (ry > r * 0.90 || Math.abs(rx) > r * 0.70) {
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
  const topAttach = { x: -r * 0.35, y: r * 0.05 };
  const botAttach = { x: -r * 0.35, y: r * 0.35 };

  // Outer Cape Boundary Points (Flowing backwards into -X)
  const topCapeTip = {
    x: -r * 1.85 + inertiaX * 0.8 + gentleSway1,
    y: -r * 0.65 + inertiaY * 0.6 - gentleSway2
  };
  const midCapeFold = {
    x: -r * 2.10 + inertiaX * 1.0 + gentleSway2,
    y: r * 0.15 + inertiaY * 0.8 + waveRipple
  };
  const botCapeTip = {
    x: -r * 1.75 + inertiaX * 0.8 - gentleSway1,
    y: r * 0.85 + inertiaY * 0.6 + gentleSway2
  };

  // Sample boundary perimeter vertices into stepped pixel points
  const poly = [];
  const N = 20;

  // 1. Top curve: topAttach -> topCapeTip
  const c1Top = { x: -r * 0.95 + inertiaX * 0.4, y: -r * 0.35 + inertiaY * 0.3 + gentleSway1 };
  const c2Top = { x: -r * 1.45 + inertiaX * 0.7 + gentleSway2, y: -r * 0.65 + inertiaY * 0.5 + waveRipple };
  for (let i = 0; i <= N; i++) {
    poly.push(cubicBezierPt(topAttach, c1Top, c2Top, topCapeTip, i / N));
  }

  // 2. Trailing edge: topCapeTip -> midCapeFold -> botCapeTip
  const cMid1 = { x: -r * 1.95 + inertiaX * 0.9 + gentleSway2, y: -r * 0.20 + inertiaY * 0.7 };
  const cMid2 = { x: -r * 1.90 + inertiaX * 0.8 - gentleSway1, y: r * 0.50 + inertiaY * 0.7 };
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    if (t <= 0.5) {
      poly.push(quadBezierPt(topCapeTip, cMid1, midCapeFold, t * 2));
    } else {
      poly.push(quadBezierPt(midCapeFold, cMid2, botCapeTip, (t - 0.5) * 2));
    }
  }

  // 3. Bottom curve: botCapeTip -> botAttach
  const c1Bot = { x: -r * 1.35 + inertiaX * 0.6 - gentleSway2, y: r * 0.70 + inertiaY * 0.4 - waveRipple };
  const c2Bot = { x: -r * 0.75 + inertiaX * 0.3, y: r * 0.45 + inertiaY * 0.2 };
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
  ctx.lineTo(snap(-r * 0.95), snap(r * 0.35));
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
    { x: -r * 0.80 + inertiaX * 0.3, y: -r * 0.10 + gentleSway1 },
    { x: -r * 1.30 + inertiaX * 0.6, y: -r * 0.05 + waveRipple },
    { x: midCapeFold.x + r * 0.20, y: midCapeFold.y - r * 0.20 },
    foldCol
  );
  // Lower fold crease
  drawPixelCrease(
    botAttach,
    { x: -r * 0.70 + inertiaX * 0.3, y: r * 0.40 - gentleSway2 },
    { x: -r * 1.20 + inertiaX * 0.5, y: r * 0.55 + waveRipple },
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

  // 2. Hands (Back & Front - Pixel Art Drawing)
  const handRadius = Math.max(r * 0.38, 8.5);
  const backHandX = 0, backHandY = r * 0.10;

  // Back Hand
  drawSaitamaPixelGlove(ctx, backHandX, backHandY, handRadius);

  // 3. Body Circle (Pixel Art)
  drawSaitamaPixelBody(ctx, r, true);

  // Front Hand
  const frontHandX = r * 0.95, frontHandY = r * 0.25;
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
