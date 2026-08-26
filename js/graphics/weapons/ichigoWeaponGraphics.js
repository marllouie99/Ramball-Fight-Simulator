import { state } from '../../core/state.js';

export function drawGetsugaSlash(ctx, p, isBlack) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  const owner = state.fighters && state.fighters[p.owner];
  const form = p.getsugaForm || (isBlack ? (owner && owner.hollowMaskActive ? 'hollow' : 'bankai') : 'shikai');
  
  const isFinal = form === 'final_bankai';
  const isMask = form === 'hollow';
  const isBankai = form === 'bankai' || isFinal;
  const isShikai = form === 'shikai';

  const scale = owner ? Math.max(0.9, owner.r / 22) : 1.0;
  const lifeRatio = Math.max(0.2, (p.life || 30) / (p.maxLife || 30));
  const alpha = Math.min(1.0, lifeRatio * 1.2);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  const scaleMult = isFinal ? 2.10 : (isMask ? 1.50 : 1.35);
  ctx.scale(scale * scaleMult, scale * scaleMult);

  const r = isFinal ? 72 : (isMask ? 54 : (isBankai ? 46 : 48));
  const maxThick = isFinal ? 28 : (isMask ? 20 : (isBankai ? 16 : 17));
  const halfSpan = isFinal ? (0.84 * Math.PI) : (isMask ? (0.78 * Math.PI) : (0.76 * Math.PI)); // ~137° - 151° sweep
  const numSteps = 32;

  // 1. Pass 1: Outer Reiatsu Spiritual Pressure Bloom Wave
  ctx.beginPath();
  // Front leading curve
  for (let i = 0; i <= numSteps; i++) {
    const t = (i / numSteps) * 2 - 1; // -1 to +1
    const ang = t * halfSpan;
    const taper = Math.cos(t * (Math.PI / 2));
    const dist = r + taper * (isFinal ? 8.5 : 5.5);
    const px = Math.cos(ang) * dist;
    const py = Math.sin(ang) * dist;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  // Inner trailing curve
  for (let i = numSteps; i >= 0; i--) {
    const t = (i / numSteps) * 2 - 1;
    const ang = t * halfSpan;
    const taper = Math.cos(t * (Math.PI / 2));
    const dist = r - (maxThick * taper) - taper * (isFinal ? 10.0 : 7.0);
    const px = Math.cos(ang) * dist;
    const py = Math.sin(ang) * dist;
    ctx.lineTo(px, py);
  }
  ctx.closePath();

  if (isFinal) ctx.fillStyle = `rgba(220, 20, 60, ${0.65 * alpha})`;
  else if (isMask) ctx.fillStyle = `rgba(255, 40, 0, ${0.50 * alpha})`;
  else if (isBankai) ctx.fillStyle = `rgba(0, 229, 255, ${0.45 * alpha})`;
  else ctx.fillStyle = `rgba(0, 191, 255, ${0.45 * alpha})`;
  ctx.fill();

  // 2. Pass 2: Dense Core Crescent Wave Polygon
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = (i / numSteps) * 2 - 1;
    const ang = t * halfSpan;
    const taper = Math.cos(t * (Math.PI / 2));
    const dist = r + taper * (isFinal ? 3.5 : 2.0);
    const px = Math.cos(ang) * dist;
    const py = Math.sin(ang) * dist;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = numSteps; i >= 0; i--) {
    const t = (i / numSteps) * 2 - 1;
    const ang = t * halfSpan;
    const taper = Math.cos(t * (Math.PI / 2));
    const dist = r - (maxThick * taper);
    const px = Math.cos(ang) * dist;
    const py = Math.sin(ang) * dist;
    ctx.lineTo(px, py);
  }
  ctx.closePath();

  if (isFinal) ctx.fillStyle = `rgba(10, 2, 4, ${0.98 * alpha})`;
  else if (isMask) ctx.fillStyle = `rgba(15, 4, 4, ${0.96 * alpha})`;
  else if (isBankai) ctx.fillStyle = `rgba(10, 10, 14, ${0.96 * alpha})`;
  else ctx.fillStyle = `rgba(240, 248, 255, ${0.95 * alpha})`;
  ctx.fill();

  // 3. Pass 3: Brilliant Leading Cutting Edge Highlight
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = (i / numSteps) * 2 - 1;
    const ang = t * halfSpan;
    const taper = Math.cos(t * (Math.PI / 2));
    const dist = r - (maxThick * taper * 0.1);
    const px = Math.cos(ang) * dist;
    const py = Math.sin(ang) * dist;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  if (isFinal) {
    ctx.strokeStyle = `rgba(255, 40, 40, ${1.0 * alpha})`;
    ctx.lineWidth = 3.2;
  } else if (isMask) {
    ctx.strokeStyle = `rgba(255, 120, 0, ${0.92 * alpha})`;
    ctx.lineWidth = 2.6;
  } else if (isBankai) {
    ctx.strokeStyle = `rgba(0, 240, 255, ${0.95 * alpha})`;
    ctx.lineWidth = 2.4;
  } else {
    ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 * alpha})`;
    ctx.lineWidth = 2.6;
  }
  ctx.stroke();

  // 4. Pass 4: Trailing Reiatsu Streamers / Speed Needles
  const streamerCount = isFinal ? 9 : (isMask ? 7 : 6);
  ctx.save();
  for (let s = 0; s < streamerCount; s++) {
    const stNorm = (s / (streamerCount - 1)) * 2 - 1; // -1 to +1
    const stAng = stNorm * (halfSpan * 0.85);
    const taper = Math.cos(stNorm * (Math.PI / 2));
    const startRad = r - (maxThick * taper * 0.8);
    const trailLen = (isFinal ? 38 : (isMask ? 24 : 20)) + taper * (isFinal ? 35 : 25);

    const sx1 = Math.cos(stAng) * startRad;
    const sy1 = Math.sin(stAng) * startRad;
    const sx2 = sx1 - trailLen;
    const sy2 = sy1 + (stNorm * 6);

    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);

    if (isFinal) ctx.strokeStyle = `rgba(220, 20, 60, ${0.85 * alpha})`;
    else if (isMask) ctx.strokeStyle = `rgba(255, 60, 0, ${0.75 * alpha})`;
    else if (isBankai) ctx.strokeStyle = `rgba(0, 229, 255, ${0.75 * alpha})`;
    else ctx.strokeStyle = `rgba(135, 206, 250, ${0.80 * alpha})`;

    ctx.lineWidth = isFinal ? 2.2 : 1.6;
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}

export function drawCeroBeam(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  const lifeRatio = Math.max(0.3, (p.life || 30) / (p.maxLife || 30));

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // Outer red energy column (cero width reads from config, default 80px)
  const beamWidth = 60;
  const beamLength = 400; // Large visual column

  // Outer Crimson Glow
  const grad = ctx.createLinearGradient(0, -beamWidth, 0, beamWidth);
  grad.addColorStop(0, 'rgba(139, 0, 0, 0)');
  grad.addColorStop(0.3, `rgba(255, 10, 10, ${0.8 * lifeRatio})`);
  grad.addColorStop(0.5, `rgba(255, 255, 255, ${0.95 * lifeRatio})`); // white hot core
  grad.addColorStop(0.7, `rgba(255, 10, 10, ${0.8 * lifeRatio})`);
  grad.addColorStop(1.0, 'rgba(139, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(-50, -beamWidth, beamLength + 50, beamWidth * 2);

  // Add round energy sparks/circles on the beam tip
  ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * lifeRatio})`;
  ctx.beginPath();
  ctx.arc(beamLength, 0, beamWidth * 0.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(220, 10, 10, ${0.75 * lifeRatio})`;
  ctx.beginPath();
  ctx.arc(beamLength, 0, beamWidth * 0.9, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawShikaiZangetsu(ctx, x, y, angle, r) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Standalone weapon scale
  const scale = 0.78;
  ctx.scale(scale, scale);

  const handleLen = 42;
  const handleThick = 6.5;
  const hiltX = -handleLen; // -42

  // 1. Draw Trailing White Cloth Ribbons from the Pommel (Slim & Compact 3 Strands)
  ctx.save();

  // Ribbon Strand 3 (Deepest downward loop, weaving behind)
  ctx.fillStyle = '#EAEAEA';
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hiltX - 1, 1);
  ctx.bezierCurveTo(hiltX - 12, 10, hiltX - 14, 24, hiltX - 2, 27);
  ctx.bezierCurveTo(hiltX + 10, 30, hiltX + 22, 22, hiltX + 38, 20);
  ctx.lineTo(hiltX + 36, 17);
  ctx.bezierCurveTo(hiltX + 22, 19, hiltX + 10, 26, hiltX - 2, 24);
  ctx.bezierCurveTo(hiltX - 10, 22, hiltX - 8, 9, hiltX - 1, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ribbon Strand 2 (Middle strand crossing under Strand 1)
  ctx.fillStyle = '#F5F5F5';
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hiltX - 1, 1);
  ctx.bezierCurveTo(hiltX - 8, 6, hiltX - 8, 18, hiltX + 2, 20);
  ctx.bezierCurveTo(hiltX + 15, 22, hiltX + 28, 16, hiltX + 46, 23);
  ctx.lineTo(hiltX + 44, 20);
  ctx.bezierCurveTo(hiltX + 28, 13, hiltX + 15, 19, hiltX + 2, 17);
  ctx.bezierCurveTo(hiltX - 5, 15, hiltX - 5, 5, hiltX, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ribbon Strand 1 (Front strand crossing over middle and waving to top tail)
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(hiltX - 1, 1);
  ctx.bezierCurveTo(hiltX - 10, 8, hiltX - 11, 22, hiltX - 1, 24);
  ctx.bezierCurveTo(hiltX + 10, 26, hiltX + 22, 12, hiltX + 38, 13);
  ctx.bezierCurveTo(hiltX + 46, 14, hiltX + 50, 16, hiltX + 54, 13);
  ctx.lineTo(hiltX + 52, 10);
  ctx.bezierCurveTo(hiltX + 48, 12, hiltX + 44, 11, hiltX + 36, 10);
  ctx.bezierCurveTo(hiltX + 22, 9, hiltX + 10, 22, hiltX - 1, 21);
  ctx.bezierCurveTo(hiltX - 8, 19, hiltX - 7, 7, hiltX, 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fabric Pommel Wrap Knot
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.ellipse(hiltX - 1.5, 0, 2.8, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // 2. Draw Handle / Hilt (white cloth wrapped directly around hilt, NO handguard/collar!)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(hiltX, -handleThick / 2);
  ctx.lineTo(0, -handleThick / 2);
  ctx.lineTo(0, handleThick / 2);
  ctx.lineTo(hiltX, handleThick / 2);
  ctx.closePath();
  ctx.fill();

  // Fabric wrapping texture lines (white cloth wrapped around hilt)
  ctx.strokeStyle = '#D8D8D8';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  for (let px = hiltX + 4; px < 0; px += 4.5) {
    ctx.moveTo(px, -handleThick / 2);
    ctx.lineTo(px + 2.5, handleThick / 2);
    ctx.moveTo(px + 2.5, -handleThick / 2);
    ctx.lineTo(px, handleThick / 2);
  }
  ctx.stroke();

  // Handle outer outline
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(hiltX, -handleThick / 2, handleLen, handleThick);

  // 3. Blade Geometry
  const tipX = 145, tipY = -12;
  const cutoutR = 7.0;
  const cutoutCenterX = cutoutR, cutoutCenterY = 3.5;
  const heelX = cutoutR * 2, heelY = 22;

  // A) Draw Black Back Spine Region (Upper Portion of the Blade)
  ctx.fillStyle = '#1A1A1A';
  ctx.beginPath();
  ctx.moveTo(0, -3.5);
  ctx.lineTo(tipX, tipY);
  ctx.quadraticCurveTo(75, -2, heelX, cutoutCenterY);
  ctx.arc(cutoutCenterX, cutoutCenterY, cutoutR, 0, Math.PI, true);
  ctx.lineTo(0, 6.0); // Small downward spur under handle
  ctx.lineTo(0, -3.5);
  ctx.closePath();
  ctx.fill();

  // B) Draw Silver Steel Blade Body (Main Lower Region & Cutting Edge)
  const silverGrad = ctx.createLinearGradient(heelX, 0, tipX, 0);
  silverGrad.addColorStop(0, '#E5E5E5');
  silverGrad.addColorStop(0.3, '#FFFFFF');
  silverGrad.addColorStop(0.7, '#ECECEC');
  silverGrad.addColorStop(1, '#D8D8D8');

  ctx.fillStyle = silverGrad;
  ctx.beginPath();
  ctx.moveTo(heelX, heelY);
  ctx.quadraticCurveTo(80, 18, tipX, tipY); // Bottom cutting edge arc
  ctx.quadraticCurveTo(75, -2, heelX, cutoutCenterY); // Seam line separating black spine
  ctx.lineTo(heelX, heelY); // Heel vertical line
  ctx.closePath();
  ctx.fill();

  // C) Draw Outer Outlines & Seam Details
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -3.5);
  ctx.lineTo(tipX, tipY);
  ctx.quadraticCurveTo(80, 18, heelX, heelY);
  ctx.lineTo(heelX, cutoutCenterY);
  ctx.arc(cutoutCenterX, cutoutCenterY, cutoutR, 0, Math.PI, true);
  ctx.lineTo(0, 6.0);
  ctx.lineTo(0, -3.5);
  ctx.closePath();
  ctx.stroke();

  // Seam line separating Black Spine from Silver Steel Body
  ctx.strokeStyle = 'rgba(20, 20, 20, 0.7)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(heelX, cutoutCenterY);
  ctx.quadraticCurveTo(75, -2, tipX, tipY);
  ctx.stroke();

  // Metallic highlight line along silver edge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(heelX + 1, heelY - 2);
  ctx.quadraticCurveTo(80, 16, tipX - 2, tipY + 0.5);
  ctx.stroke();

  ctx.restore();
}

export function drawTensaZangetsu(ctx, x, y, angle, r) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const scale = 0.88;
  ctx.scale(scale, scale);

  const swordLen = 58;
  const swordStartX = r * 0.7;

  // 1. Guard / Tsuba (Manji / cross shape)
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(swordStartX - 2, -8, 4, 16);
  ctx.fillRect(swordStartX - 8, -2, 16, 4);

  // Outline the tsuba
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(swordStartX - 2, -8, 4, 16);
  ctx.strokeRect(swordStartX - 8, -2, 16, 4);

  // Hilt handle extending backward
  ctx.fillStyle = '#1C1C1C';
  ctx.fillRect(swordStartX - 16, -2, 14, 4);
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(swordStartX - 16, -2, 14, 4);

  // Criss-cross red diamond wrap details on Bankai hilt
  ctx.strokeStyle = '#990000';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let hx = swordStartX - 14; hx < swordStartX - 2; hx += 3) {
    ctx.moveTo(hx, -2);
    ctx.lineTo(hx + 1.5, 2);
    ctx.moveTo(hx, 2);
    ctx.lineTo(hx + 1.5, -2);
  }
  ctx.stroke();

  // 2. Blade Body (Slender black daito blade)
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.moveTo(swordStartX, -2);
  ctx.lineTo(swordStartX + swordLen - 8, -1.8);
  ctx.lineTo(swordStartX + swordLen, 0); // Tip
  ctx.lineTo(swordStartX + swordLen - 8, 1.8);
  ctx.lineTo(swordStartX, 2);
  ctx.closePath();
  ctx.fill();

  // Blade outline / edge highlight
  ctx.strokeStyle = '#00E5FF'; // Cyan glowing edge highlight
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // 3. Hilt Pommel Black Chain
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(swordStartX - 16, 0);
  ctx.bezierCurveTo(swordStartX - 22, -6, swordStartX - 26, 6, swordStartX - 32, -2);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws Ichigo's signature Crescent Blade Slash Arc (Rule 15 Compliant).
 * Renders in world coordinates underneath/around the blade during active basic chops.
 * Form-specific palettes:
 *  - Shikai: Silver steel with sky-blue/cyan Reiatsu glow
 *  - Bankai: Deep Getsuga black void core with electric cyan Reiatsu edge
 *  - Hollow Mask: Black void core with flaming crimson/orange edge
 *  - Vasto Lorde: Demonic pitch-black core with blazing blood-red trim
 */
export function drawIchigoSlashArc(ctx, fighter) {
  if (!fighter || fighter.slashSwingTimer <= 0 || fighter.isChannelingGetsuga || fighter.isChannelingBankai || fighter.isFrozenByInfinity || (fighter.timeStopTimer && fighter.timeStopTimer > 0) || (fighter.statusEffects && fighter.statusEffects.timeStopTimer > 0)) return;

  const maxT = fighter.slashSwingMaxTimer || 22;
  const rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.slashSwingTimer / maxT)));

  const r = fighter.r || 25;
  const baseAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const facingLeft = Math.abs(baseAngle) > Math.PI / 2;

  const isMask = Boolean(fighter.hollowMaskActive);
  const isBankai = Boolean(fighter.bankaiActive || fighter.skin === 'bankai');
  const isShikai = !isBankai;

  // Arc angles matching the exact sword rotation span (top-to-bottom downward power chop)
  const startOffset = -1.35; // ~ -77 degrees (upper-left chamber)
  const endOffset = 1.20;   // ~ +69 degrees (lower-right follow-through)

  let currentTipOffset = startOffset;
  let currentTailOffset = startOffset;
  let trailAlpha = 1.0;

  const windupCutoff = 0.10;
  const cutCutoff = 0.55;

  if (rawProgress < windupCutoff) {
    // Brief windup anticipation (trail hidden)
    return;
  } else if (rawProgress < cutCutoff) {
    // Active Cutting Phase: crescent expands with buttery cubic Hermite ease
    const t = (rawProgress - windupCutoff) / (cutCutoff - windupCutoff);
    const eased = t * t * (3 - 2 * t);
    currentTipOffset = startOffset + eased * (endOffset - startOffset);
    currentTailOffset = startOffset;
    trailAlpha = Math.sin(Math.min(1.0, t * 1.5) * (Math.PI / 2));
  } else {
    // Recovery Phase: Tip stays locked at final follow-through angle while tail cleanly erases
    const recP = (rawProgress - cutCutoff) / (1.0 - cutCutoff);
    const easedRec = 0.5 + 0.5 * Math.cos(recP * Math.PI);
    currentTipOffset = endOffset;
    currentTailOffset = endOffset - (endOffset - startOffset) * easedRec;
    trailAlpha = Math.sin((1.0 - recP) * (Math.PI / 2));
  }

  if (trailAlpha <= 0.01 || Math.abs(currentTipOffset - currentTailOffset) < 0.04) return;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.rotate(baseAngle);

  // Mirror vertically when aiming left so swing remains top-to-bottom
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  const outerRadius = r + (isMask ? 76 : (isShikai ? 80 : 70));
  const maxThick = isMask ? 25.0 : (isShikai ? 27.0 : 23.0);
  const numSteps = 32;

  // 1. Pass 1: Spiritual Pressure / Reiatsu Outer Soft Glow Bloom
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius + taper * 5.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = numSteps; i >= 0; i--) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius - (maxThick * taper) - taper * 4.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    ctx.lineTo(px, py);
  }
  ctx.closePath();

  if (isMask) {
    ctx.fillStyle = `rgba(255, 40, 0, ${0.50 * trailAlpha})`;
  } else if (isShikai) {
    ctx.fillStyle = `rgba(0, 191, 255, ${0.45 * trailAlpha})`;
  } else {
    ctx.fillStyle = `rgba(0, 229, 255, ${0.46 * trailAlpha})`;
  }
  ctx.fill();

  // 2. Pass 2: High-Density Core Blade Crescent Polygon
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius + taper * 1.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = numSteps; i >= 0; i--) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius - (maxThick * taper);
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    ctx.lineTo(px, py);
  }
  ctx.closePath();

  if (isMask) {
    ctx.fillStyle = `rgba(18, 5, 5, ${0.95 * trailAlpha})`;
  } else if (isShikai) {
    ctx.fillStyle = `rgba(242, 246, 255, ${0.96 * trailAlpha})`;
  } else {
    ctx.fillStyle = `rgba(10, 10, 14, ${0.95 * trailAlpha})`;
  }
  ctx.fill();

  // 3. Pass 3: Brilliant Cutting Edge Highlight Line
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.12) * (0.26 + 0.74 * t);
    const rad = outerRadius - (maxThick * taper * 0.15);
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }

  if (isMask) {
    ctx.strokeStyle = `rgba(255, 120, 0, ${0.88 * trailAlpha})`;
    ctx.lineWidth = 2.0;
  } else if (isShikai) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${1.0 * trailAlpha})`;
    ctx.lineWidth = 2.0;
  } else {
    ctx.strokeStyle = `rgba(0, 229, 255, ${0.90 * trailAlpha})`;
    ctx.lineWidth = 1.8;
  }
  ctx.stroke();

  // 4. Pass 4: Dynamic Reiatsu Speed Needles flying from cutting tip
  if (rawProgress >= 0.15 && rawProgress <= 0.50) {
    const sparkT = (rawProgress - 0.15) / 0.35;
    const tipAngle = currentTipOffset;
    const sparkCount = 3;
    ctx.save();
    for (let s = 0; s < sparkCount; s++) {
      const spOffset = (s - 1) * 0.08;
      const spAng = tipAngle + spOffset;
      const spDist = outerRadius + 4 + (s * 3);
      const spLen = 12 + (1 - sparkT) * 10;
      
      const spX1 = Math.cos(spAng) * spDist;
      const spY1 = Math.sin(spAng) * spDist;
      const spX2 = spX1 + Math.cos(spAng + 0.4) * spLen;
      const spY2 = spY1 + Math.sin(spAng + 0.4) * spLen;

      ctx.beginPath();
      ctx.moveTo(spX1, spY1);
      ctx.lineTo(spX2, spY2);

      if (isMask) ctx.strokeStyle = `rgba(255, 160, 20, ${0.85 * trailAlpha})`;
      else if (isShikai) ctx.strokeStyle = `rgba(255, 255, 255, ${0.90 * trailAlpha})`;
      else ctx.strokeStyle = `rgba(100, 240, 255, ${0.85 * trailAlpha})`;

      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

