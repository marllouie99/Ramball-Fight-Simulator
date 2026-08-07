import { getHandSize } from '../../core/config.js';
import { state, isChampionScreenActive } from '../../core/state.js';

/**
 * Visual Skin Renderer for Saitama (The Caped Baldy)
 * Recreated precisely matching Yuji/Todo punch animation standards & anime flowing cape folds.
 */
export function drawSaitamaSkin(ctx, fighter) {
  const r = fighter.r || 25;
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const now = Date.now();

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || fighter.angle || 0);
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  // Smooth sinusoidal punch progress
  const isPunching = fighter.punchAnimTimer && fighter.punchAnimTimer > 0;
  let rawProgress = 0;
  if (isPunching) {
    const maxT = fighter.punchActiveMaxTime || fighter.punchMaxTime || 22;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
  }

  const easePunch = Math.sin(rawProgress * Math.PI);
  const lungeExtension = isPunching ? easePunch * (r * 1.5) : 0;
  const oppositeRecoil = isPunching ? -Math.sin(rawProgress * Math.PI * 0.8) * (r * 0.25) : 0;

  let frontHandX, frontHandY, backHandX, backHandY;

  if (isPunching) {
    frontHandX = -r * 0.55; frontHandY = r * 0.35;
    backHandX  =  r * 0.55; backHandY  = r * 0.35;

    if (fighter.isRightPunch) {
      frontHandX += lungeExtension * 1.40;
      frontHandY += (0.12 - frontHandY) * easePunch;
      backHandX  += oppositeRecoil;
    } else {
      backHandX  += lungeExtension * 1.60;
      backHandY  += (0.12 - backHandY) * easePunch;
      frontHandX += oppositeRecoil;
    }
  } else {
    // Idle brawler guard stance: outer hand extends forward toward enemy at shoulder height
    frontHandX = r * 0.85; frontHandY = r * 0.15;
    backHandX  = 0;        backHandY  = -r * 0.15;
  }

  const handRadius = Math.max(r * 0.38, getHandSize(8.5));
  const isChampScreen = (typeof isChampionScreenActive === 'function' && isChampionScreenActive()) ||
                        fighter._isWinnerReveal ||
                        (typeof state !== 'undefined' && (state.gameState === 'countdown' || state.gameState === 'matchEnd' || state.gameState === 'roundEnd'));

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

  // ── Render Back Hand (Back Layer - Behind Body Circle) ──
  if (!isChampScreen && !fighter.hideBackHand) {
    ctx.beginPath();
    ctx.arc(backHandX, backHandY, handRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#C80000';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.0;
    ctx.stroke();
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
  if (!isChampScreen && !fighter.hideFrontHand) {
    ctx.beginPath();
    ctx.arc(frontHandX, frontHandY, handRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#C80000';
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3.0;
    ctx.stroke();
  }

  // Status Overlays (stun, slow, burn, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}
