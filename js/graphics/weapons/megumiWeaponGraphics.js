// ─────────────────────────────────────────────
// Megumi Fushiguro — Weapon & Technique Graphics
// Megumi's Cursed Sword & Shadow Slash Arc
// Authentic Season 1 Broad Slab Cursed Blade
// Features:
// - Heavy slate-steel rectangular slab blade with sharp diamond spearpoint tip.
// - Rectangular cutout slot fuller hole near the tip.
// - Full spiral cloth bandage wrapping covering ring pommel, cylindrical grip, and flared collar.
// - Authentic dark forged steel beveling with pure silver-slate reflections (NO green line).
// - Double-tapered shadow slash crescent (Rule 15).
// Adheres strictly to Rule 11 (Zero shadowBlur) & Rule 20 (Skin Only).
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

/**
 * Draws Megumi's signature Cursed Sword (Broad Slab Blade).
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x Hand anchor X
 * @param {number} y Hand anchor Y
 * @param {number} angle Additional swing angle in radians
 * @param {number} r Fighter radius
 * @param {boolean} isSwinging Whether actively slashing
 * @param {number} swingProgress Progress of the swing (0 to 1)
 */
export function drawMegumiShadowBlade(ctx, x = 0, y = 0, angle = 0, r = 25, isSwinging = false, swingProgress = 0) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;

  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.megumi)
    ? state.weaponCustomizations.megumi
    : { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };

  const customScale = custom.scale !== undefined ? custom.scale : 1.0;
  const customOffsetX = custom.offsetX !== undefined ? custom.offsetX : 0;
  const customOffsetY = custom.offsetY !== undefined ? custom.offsetY : 0;
  const customAngle = custom.angleOffset !== undefined ? custom.angleOffset : 0;

  ctx.save();
  ctx.translate(x + customOffsetX, y + customOffsetY);
  ctx.rotate(angle + customAngle);
  ctx.scale(customScale, customScale);

  const scale = r / 25;

  // 1. Subtle Dark Shadow / Cursed Energy Mist
  const glowGrad = ctx.createRadialGradient(28 * scale, 0, 4 * scale, 28 * scale, 0, 34 * scale);
  glowGrad.addColorStop(0, 'rgba(28, 45, 74, 0.35)');
  glowGrad.addColorStop(0.65, 'rgba(15, 20, 30, 0.15)');
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(28 * scale, 0, 34 * scale, 0, Math.PI * 2);
  ctx.fill();

  // ─────────────────────────────────────────────
  // 2. FULLY WRAPPED CLOTH BANDAGE RING POMMEL & HILT (Along -X)
  // ─────────────────────────────────────────────
  const hiltL = 20 * scale;
  const hiltThick = 4.6 * scale;
  const ringRadius = 5.6 * scale;
  const ringInnerRadius = 2.4 * scale;
  const ringCenterX = -hiltL - ringRadius + 1.2 * scale;

  // A. Ring Pommel Base (Cloth wrapped ring)
  ctx.fillStyle = '#E3E6EE'; // Off-white cloth
  ctx.strokeStyle = '#0F1218';
  ctx.lineWidth = 1.4 * scale;
  ctx.beginPath();
  ctx.arc(ringCenterX, 0, ringRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ring Center Cutout Hole
  ctx.fillStyle = '#07080C';
  ctx.beginPath();
  ctx.arc(ringCenterX, 0, ringInnerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ring Spiral Cloth Bandage Seams (wrapping around the ring)
  ctx.strokeStyle = '#9AA2B2';
  ctx.lineWidth = 1.0 * scale;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(ringCenterX + Math.cos(a) * (ringInnerRadius + 0.2 * scale), Math.sin(a) * (ringInnerRadius + 0.2 * scale));
    ctx.lineTo(ringCenterX + Math.cos(a + 0.2) * (ringRadius - 0.2 * scale), Math.sin(a + 0.2) * (ringRadius - 0.2 * scale));
    ctx.stroke();
  }

  // B. Cylindrical Handle Wrapped in Spiral Cloth Bandages
  ctx.fillStyle = '#E3E6EE'; // Cloth base
  ctx.strokeStyle = '#0F1218';
  ctx.lineWidth = 1.4 * scale;
  ctx.beginPath();
  ctx.roundRect(-hiltL, -hiltThick / 2, hiltL, hiltThick, 1.2 * scale);
  ctx.fill();
  ctx.stroke();

  // Handle Cloth Shading (Lower half subtle shadow)
  ctx.fillStyle = '#C8CFDC';
  ctx.beginPath();
  ctx.roundRect(-hiltL, 0, hiltL, hiltThick / 2, 0.8 * scale);
  ctx.fill();

  // Handle Spiral Bandage Wrap Folds
  ctx.strokeStyle = '#9098A8';
  ctx.lineWidth = 1.1 * scale;
  for (let i = 1; i <= 6; i++) {
    const rx = -hiltL + (hiltL / 7) * i;
    ctx.beginPath();
    ctx.moveTo(rx - 1.8 * scale, -hiltThick / 2 + 0.4 * scale);
    ctx.lineTo(rx + 1.2 * scale, hiltThick / 2 - 0.4 * scale);
    ctx.stroke();
  }

  // ─────────────────────────────────────────────
  // 3. THICK FLARED BANDAGE COLLAR / BOLSTER (At Blade Base)
  // ─────────────────────────────────────────────
  const wrapStartX = 0;
  const wrapL = 13.0 * scale;
  const wrapH = 13.0 * scale;

  // Trapezoidal Flared Collar (expands smoothly from grip towards blade)
  ctx.beginPath();
  ctx.moveTo(wrapStartX, -hiltThick / 2 - 0.8 * scale);
  ctx.lineTo(wrapStartX + wrapL, -wrapH / 2);
  ctx.lineTo(wrapStartX + wrapL, wrapH / 2);
  ctx.lineTo(wrapStartX, hiltThick / 2 + 0.8 * scale);
  ctx.closePath();

  ctx.fillStyle = '#E3E6EE'; // Light bandage cloth
  ctx.fill();
  ctx.strokeStyle = '#0F1218';
  ctx.lineWidth = 1.4 * scale;
  ctx.stroke();

  // Lower Collar Shading
  ctx.fillStyle = '#C4CBD8';
  ctx.beginPath();
  ctx.moveTo(wrapStartX, 0);
  ctx.lineTo(wrapStartX + wrapL, 0);
  ctx.lineTo(wrapStartX + wrapL, wrapH / 2);
  ctx.lineTo(wrapStartX, hiltThick / 2 + 0.8 * scale);
  ctx.closePath();
  ctx.fill();

  // Bandage Overlap Crease Folds
  ctx.strokeStyle = '#8E96A6';
  ctx.lineWidth = 1.2 * scale;
  for (let i = 1; i <= 3; i++) {
    const wx = wrapStartX + (wrapL / 4) * i;
    const topY = -hiltThick / 2 - 0.8 * scale + ((-wrapH / 2 - (-hiltThick / 2 - 0.8 * scale)) * (i / 4));
    const botY = hiltThick / 2 + 0.8 * scale + ((wrapH / 2 - (hiltThick / 2 + 0.8 * scale)) * (i / 4));
    ctx.beginPath();
    ctx.moveTo(wx - 1.0 * scale, topY + 0.5 * scale);
    ctx.lineTo(wx + 0.5 * scale, botY - 0.5 * scale);
    ctx.stroke();
  }

  // ─────────────────────────────────────────────
  // 4. HEAVY SLATE CHARCOAL BROAD BLADE WITH DIAMOND BEVELS & CUTOUT SLOT
  // ─────────────────────────────────────────────
  const bladeStartX = wrapStartX + wrapL;
  const bladeBodyL = 38 * scale;
  const tipL = 14 * scale;
  const bladeH = 12.0 * scale;

  const shoulderX = bladeStartX + bladeBodyL;
  const tipX = shoulderX + tipL;

  // Blade Main Contour Path
  ctx.beginPath();
  ctx.moveTo(bladeStartX, -bladeH / 2);
  ctx.lineTo(shoulderX, -bladeH / 2);
  ctx.lineTo(tipX, 0); // Crisp Spearpoint Tip
  ctx.lineTo(shoulderX, bladeH / 2);
  ctx.lineTo(bladeStartX, bladeH / 2);
  ctx.closePath();

  // A. Dark Slate Steel Base Body Fill
  ctx.fillStyle = '#343844';
  ctx.fill();

  // B. Upper Blade Spine Highlight (Light Steel)
  ctx.fillStyle = '#4E5566';
  ctx.beginPath();
  ctx.moveTo(bladeStartX, -bladeH / 2);
  ctx.lineTo(shoulderX, -bladeH / 2);
  ctx.lineTo(tipX, 0);
  ctx.lineTo(bladeStartX, 0);
  ctx.closePath();
  ctx.fill();

  // C. Lower Blade Shadow Facet (Deep Charcoal)
  ctx.fillStyle = '#22252E';
  ctx.beginPath();
  ctx.moveTo(bladeStartX, 0);
  ctx.lineTo(tipX, 0);
  ctx.lineTo(shoulderX, bladeH / 2);
  ctx.lineTo(bladeStartX, bladeH / 2);
  ctx.closePath();
  ctx.fill();

  // D. Crisp Sharpened Silver Edge Bevels along Perimeter
  ctx.strokeStyle = '#8E96A8';
  ctx.lineWidth = 1.1 * scale;
  ctx.beginPath();
  ctx.moveTo(bladeStartX + 1 * scale, -bladeH / 2 + 1 * scale);
  ctx.lineTo(shoulderX, -bladeH / 2 + 1 * scale);
  ctx.lineTo(tipX - 1.5 * scale, 0);
  ctx.lineTo(shoulderX, bladeH / 2 - 1 * scale);
  ctx.lineTo(bladeStartX + 1 * scale, bladeH / 2 - 1 * scale);
  ctx.stroke();

  // E. Central Ridge Spine Line
  ctx.strokeStyle = '#181A22';
  ctx.lineWidth = 1.3 * scale;
  ctx.beginPath();
  ctx.moveTo(bladeStartX, 0);
  ctx.lineTo(tipX, 0);
  ctx.stroke();

  // F. Rectangular Cutout Slot Near Tip (Iconic feature from 3D model!)
  const slotW = 7.5 * scale;
  const slotH = 2.4 * scale;
  const slotX = shoulderX - 4.5 * scale;
  const slotY = -slotH / 2;

  // Slot Dark Cutout Interior
  ctx.fillStyle = '#07080C';
  ctx.strokeStyle = '#0F1218';
  ctx.lineWidth = 1.0 * scale;
  ctx.beginPath();
  ctx.roundRect(slotX, slotY, slotW, slotH, 0.6 * scale);
  ctx.fill();
  ctx.stroke();

  // Slot Steel Bevel Rim Highlight (Upper edge reflection)
  ctx.strokeStyle = '#767E90';
  ctx.lineWidth = 0.8 * scale;
  ctx.beginPath();
  ctx.moveTo(slotX, slotY + slotH);
  ctx.lineTo(slotX, slotY);
  ctx.lineTo(slotX + slotW, slotY);
  ctx.stroke();

  // G. Crisp Manga Ink Outline for Entire Outer Blade
  ctx.strokeStyle = '#0F1218';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(bladeStartX, -bladeH / 2);
  ctx.lineTo(shoulderX, -bladeH / 2);
  ctx.lineTo(tipX, 0);
  ctx.lineTo(shoulderX, bladeH / 2);
  ctx.lineTo(bladeStartX, bladeH / 2);
  ctx.closePath();
  ctx.stroke();

  // Tip Diamond Highlight Point (Forged Steel reflection)
  ctx.fillStyle = '#CBD2E0';
  ctx.beginPath();
  ctx.arc(tipX - 1.0 * scale, 0, 1.2 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Backward compatibility alias for drawMegumiShadowBlade.
 */
export function drawMegumiDagger(ctx, x = 0, y = 0, angle = 0, r = 25, isSwinging = false, swingProgress = 0) {
  drawMegumiShadowBlade(ctx, x, y, angle, r, isSwinging, swingProgress);
}

/**
 * Draws Megumi's Toji-Style Supersonic Shadow Thrust Shockwave (Rule 16 Compliant).
 * Features sharp forward manga needle streaks, white-hot penetration core,
 * expanding conical shadow mist, and supersonic elliptical shock rings.
 */
export function drawMegumiThrustEffect(ctx, fighter, rawProgress, r, baseAngle, facingLeft) {
  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
  ctx.rotate(baseAngle);

  if (facingLeft) {
    ctx.scale(1, -1);
  }

  const chargeCutoff = 0.25;
  const plungeCutoff = 0.48;
  const holdCutoff = 0.58;

  // 1. Charge / Chambering Phase Visuals (0.0 to 0.25)
  if (rawProgress < chargeCutoff) {
    const t = rawProgress / chargeCutoff;
    const chargePulse = Math.sin(t * Math.PI * 4);
    const chargeRad = (r * 0.54) + 12;

    // Gathering cursed cyan energy arcs & spiraling ink at blade hilt
    ctx.strokeStyle = `rgba(46, 230, 168, ${0.60 + 0.35 * chargePulse})`;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(chargeRad, 0, Math.max(3, 12 * (1 - t * 0.6)), 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = `rgba(28, 45, 74, ${0.40 + 0.30 * t})`;
    ctx.beginPath();
    ctx.arc(chargeRad, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return;
  }

  // 2. Thrust Plunge & Recovery Phase Visuals (0.25 to 1.0)
  let thrustProgress = 0;
  let alpha = 1.0;

  if (rawProgress < plungeCutoff) {
    const t = (rawProgress - chargeCutoff) / (plungeCutoff - chargeCutoff);
    thrustProgress = 1 - Math.pow(1 - t, 3.5);
    alpha = Math.min(1.0, t * 2.5);
  } else if (rawProgress < holdCutoff) {
    thrustProgress = 1.0;
    alpha = 1.0;
  } else {
    const recP = (rawProgress - holdCutoff) / (1.0 - holdCutoff);
    thrustProgress = 1.0;
    alpha = Math.max(0.0, 1.0 - recP * 1.3);
  }

  if (alpha <= 0.01) {
    ctx.restore();
    return;
  }

  const startX = r * 0.60;
  const tipX = startX + thrustProgress * (r * 3.2); // Piercing lunge reach
  const coneWidth = 26 * thrustProgress;

  // Outer Dark Shadow Cone Mist
  ctx.beginPath();
  ctx.moveTo(startX, -coneWidth * 0.45);
  ctx.lineTo(tipX + 22, 0);
  ctx.lineTo(startX, coneWidth * 0.45);
  ctx.closePath();
  ctx.fillStyle = `rgba(28, 45, 74, ${0.45 * alpha})`;
  ctx.fill();

  // High-Speed Piercing Manga Needle Streaks (Rule 16 standard)
  const needleOffsets = [-14, -8, -3, 3, 8, 14];
  for (let i = 0; i < needleOffsets.length; i++) {
    const yOff = needleOffsets[i] * (coneWidth / 24);
    const nStart = startX + 10 + (Math.abs(yOff) * 1.5);
    const nEnd = tipX + 16 - (Math.abs(yOff) * 1.2);
    if (nEnd > nStart) {
      ctx.beginPath();
      ctx.moveTo(nStart, yOff);
      ctx.lineTo(nStart + (nEnd - nStart) * 0.5, yOff - 1.2);
      ctx.lineTo(nEnd, yOff);
      ctx.lineTo(nStart + (nEnd - nStart) * 0.5, yOff + 1.2);
      ctx.closePath();
      ctx.fillStyle = (i % 2 === 0) ? `rgba(46, 230, 168, ${0.90 * alpha})` : `rgba(255, 255, 255, ${0.95 * alpha})`;
      ctx.fill();
    }
  }

  // Glowing White-Hot Core Penetration Streak
  ctx.beginPath();
  ctx.moveTo(startX + 5, -2.2);
  ctx.lineTo(tipX + 26, 0);
  ctx.lineTo(startX + 5, 2.2);
  ctx.closePath();
  ctx.fillStyle = `rgba(255, 255, 255, ${0.98 * alpha})`;
  ctx.fill();

  // Supersonic Conical Shockwave Rings
  if (rawProgress < plungeCutoff) {
    const ringX = tipX + 6;
    ctx.strokeStyle = `rgba(46, 230, 168, ${0.85 * alpha})`;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(ringX, 0, 8, Math.max(2, coneWidth * 0.85), 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${0.90 * alpha})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(ringX + 9, 0, 5, Math.max(2, coneWidth * 0.60), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Draws Megumi's signature Crescent Shadow Slash Wave or Ambush Thrust (Rule 15 & 16 Compliant).
 */
export function drawMegumiSlashArc(ctx, fighter) {
  if (!fighter || (fighter.slashSwingTimer || 0) <= 0 || fighter.isTargetOfAmbush || (typeof fighter.areAttackEffectsSuppressed === 'function' && fighter.areAttackEffectsSuppressed())) return;

  const maxT = fighter.slashSwingMaxTimer || 18;
  const rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.slashSwingTimer / maxT)));

  const r = fighter.r || 25;
  const baseAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : (fighter.angle || 0);
  const facingLeft = Math.abs(baseAngle) > Math.PI / 2;

  // If fighter executed the Ambush Thrust, draw the supersonic piercing thrust effect
  if (fighter.isThrustAttack) {
    drawMegumiThrustEffect(ctx, fighter, rawProgress, r, baseAngle, facingLeft);
    return;
  }

  // Arc angles in local coordinate space: -1.30 rad (~11 o'clock) down to +1.25 rad (~5 o'clock)
  const startOffset = -1.30;
  const endOffset   = 1.25;

  let currentTipOffset = startOffset;
  let currentTailOffset = startOffset;
  let trailAlpha = 1.0;

  const windupCutoff = 0.10;
  const cutCutoff = 0.58;

  if (rawProgress < windupCutoff) {
    // Brief anticipation windup
    return;
  } else if (rawProgress < cutCutoff) {
    // Active Cutting Stroke: Crescent expands with buttery Hermite ease
    const t = (rawProgress - windupCutoff) / (cutCutoff - windupCutoff);
    const eased = t * t * (3 - 2 * t);
    currentTipOffset = startOffset + eased * (endOffset - startOffset);
    currentTailOffset = startOffset;
    trailAlpha = Math.sin(Math.min(1.0, t * 1.6) * (Math.PI / 2));
  } else {
    // Smooth Recovery: Tip locks at end angle while tail chases tip (Rule 15 trail eraser)
    const recP = (rawProgress - cutCutoff) / (1.0 - cutCutoff);
    const easedRec = 0.5 + 0.5 * Math.cos(recP * Math.PI);
    currentTipOffset = endOffset;
    currentTailOffset = endOffset - (endOffset - startOffset) * easedRec;
    trailAlpha = Math.sin((1.0 - recP) * (Math.PI / 2));
  }

  if (trailAlpha <= 0.01 || Math.abs(currentTipOffset - currentTailOffset) < 0.04) return;

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
  ctx.rotate(baseAngle);

  // Maintain consistent natural clockwise downward sweep
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  const outerRadius = r + 56; // Bold reach extending beyond the blade tip
  const maxThick = 24.0;      // Broad majestic crescent body thickness
  const numSteps = 28;

  // 1. Layer 1: Dark Midnight Shadow Aura Underlay
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.20) * (0.25 + 0.75 * t);
    const rad = outerRadius + taper * 4.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = numSteps; i >= 0; i--) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.20) * (0.25 + 0.75 * t);
    const rad = outerRadius - (maxThick * taper) - taper * 4.0;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(28, 45, 74, ${0.45 * trailAlpha})`;
  ctx.fill();

  // 2. Layer 2: Deep Ink Pitch-Black & Midnight Navy Crescent Polygon
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.20) * (0.25 + 0.75 * t);
    const rad = outerRadius + taper * 1.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = numSteps; i >= 0; i--) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.20) * (0.25 + 0.75 * t);
    const rad = outerRadius - (maxThick * taper);
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(11, 15, 23, ${0.92 * trailAlpha})`;
  ctx.fill();

  // 3. Layer 3: Silver-White Forged Steel Inner Core Crescent Streak
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.25) * (0.20 + 0.80 * t);
    const rad = outerRadius - (maxThick * 0.15 * taper);
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = numSteps; i >= 0; i--) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.25) * (0.20 + 0.80 * t);
    const rad = outerRadius - (maxThick * 0.55 * taper);
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(226, 232, 240, ${0.85 * trailAlpha})`;
  ctx.fill();

  // 4. Layer 4: Razor-Sharp White Cutting Edge Rim Line
  ctx.beginPath();
  for (let i = 0; i <= numSteps; i++) {
    const t = i / numSteps;
    const ang = currentTailOffset + t * (currentTipOffset - currentTailOffset);
    const taper = Math.pow(Math.sin(t * Math.PI), 1.20) * (0.25 + 0.75 * t);
    const rad = outerRadius + taper * 1.5;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * trailAlpha})`;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // 5. Layer 5: Bright Gleam Spark at Leading Tip
  if (rawProgress < cutCutoff) {
    const tipAngle = currentTipOffset;
    const tipRad = outerRadius;
    const tipX = Math.cos(tipAngle) * tipRad;
    const tipY = Math.sin(tipAngle) * tipRad;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Diamond Cross Glint
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(tipX - 6, tipY);
    ctx.lineTo(tipX + 6, tipY);
    ctx.moveTo(tipX, tipY - 6);
    ctx.lineTo(tipX, tipY + 6);
    ctx.stroke();
  }

  ctx.restore();
}
