import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { drawGojoOrb, drawAnamorphicLensFlare } from './gojoWeaponGraphics.js';

/**
 * Rubbick's Weapon: The Arcane Staff
 * A long, slender shaft with a complex, ornate, asymmetrical headpiece.
 * Features floating/segmented components, a glowing green magical crystal,
 * gold/bronze ornamentation, and arcane runes.
 */

export function drawRubbickStaff(ctx, fighter) {
  const baseAlpha = ctx.globalAlpha;
  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  
  // Idle breathing/floating animation for the staff hand
  const idleHover = Math.sin(Date.now() / 300) * 3;
  
  // Attack wind-up and swing animation
  let swingAngle = 0;
  let thrustOffset = 0;
  
  if (fighter.attackCooldown > 0 && fighter.attackCooldown <= 15) {
    // Wind-up phase (pulling the staff back before casting)
    const progress = (15 - fighter.attackCooldown) / 15; // 0.0 to 1.0
    swingAngle = progress * 0.4; // Tilt backwards
    thrustOffset = progress * -5; // Pull backwards
  } else if (fighter.attackSwingTimer > 0) {
    // Follow-through phase (thrusting forward)
    const progress = fighter.attackSwingTimer / 15; // 1.0 down to 0.0
    // A quick wind-up and thrust/swing forward
    swingAngle = Math.sin(progress * Math.PI) * -0.6; // staff head swings forward
    thrustOffset = Math.sin(progress * Math.PI) * 12; // thrusts outward
  }
  
  if (fighter.stolenType === 'gojo' && fighter.stolenWindUpTimer > 0) {
    const windupMax = 45;
    const progress = Math.min(1.0, Math.max(0, 1 - (fighter.stolenWindUpTimer / windupMax)));
    const gAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : 0;
    
    // Dynamic staff channeling animation:
    // Phase 1 (progress 0.0 - 0.40): Staff lifts high into celestial channeling stance, tilting upward
    // Phase 2 (progress 0.40 - 0.75): Energy fusion begins, staff levels towards target
    // Phase 3 (progress 0.75 - 1.0): Staff thrusts forward, locked in firing alignment with intense cursed vibration
    let staffDist = fighter.r * 0.85;
    let angleOffset = 0;
    let floatY = 0;
    
    if (progress < 0.40) {
      const pNorm = progress / 0.40;
      staffDist = fighter.r * 0.75 - Math.sin(pNorm * Math.PI) * 6;
      angleOffset = -0.38 * (1 - pNorm);
      floatY = -Math.sin(pNorm * Math.PI) * 12;
    } else if (progress < 0.75) {
      const pNorm = (progress - 0.40) / 0.35;
      staffDist = fighter.r * 0.75 + pNorm * (fighter.r * 0.25);
      angleOffset = 0;
      floatY = -12 * (1 - pNorm);
    } else {
      const pNorm = (progress - 0.75) / 0.25;
      staffDist = fighter.r * 1.0 + pNorm * 14;
      angleOffset = 0;
      floatY = 0;
    }
    
    ctx.translate(Math.cos(gAngle) * staffDist, Math.sin(gAngle) * staffDist + floatY);
    ctx.rotate(gAngle - (fighter.rotation || 0) + Math.PI / 2 + angleOffset);
  } else if (fighter.stolenWindUpTimer > 0 || fighter.beamCharge > 0 || fighter.beamTimer > 0) {
    // Point the staff exactly at the target like a rifle
    const gAngle = fighter.gunAngle !== undefined ? fighter.gunAngle : 0;
    ctx.translate(Math.cos(gAngle) * fighter.r, Math.sin(gAngle) * fighter.r);
    ctx.rotate(gAngle - (fighter.rotation || 0) + Math.PI / 2);
  } else if (fighter.tkTimer > 0) {
    // Telekinesis channel: lift the staff high in the right hand and point it EXACTLY at the drop location
    ctx.translate(fighter.r * 0.4, fighter.r * 0.85);
    // The staff is drawn along the Y axis, so its "front" (the crystal) points up (-Y).
    // To make -Y point to gunAngle, we add Math.PI / 2.
    const targetRot = fighter.gunAngle - (fighter.rotation || 0) + Math.PI / 2;
    ctx.rotate(targetRot);
  } else {
    // Position the staff in the "right hand" (off to the side and slightly forward)
    ctx.translate(fighter.r * 0.4 + thrustOffset, fighter.r * 0.85 + idleHover);
    let baseRot = Math.PI * 0.3; // Default idle angle
    if (fighter.gunAngle !== undefined && (fighter.attackSwingTimer > 0 || (fighter.attackCooldown !== undefined && fighter.attackCooldown <= 15))) {
      baseRot = fighter.gunAngle - (fighter.rotation || 0) + Math.PI / 2;
    }
    ctx.rotate(baseRot + swingAngle);
  }

  // Staff dimensions
  const shaftLength = 75; // Even longer for a grander look
  const shaftThickness = 5;
  const topY = -shaftLength / 2 - 12;
  const bottomY = shaftLength / 2;

  // Hands will be drawn at the end

  // 1. Staff Shaft (Premium Metallic/Dark Wood)
  const shaftGrad = ctx.createLinearGradient(-shaftThickness, 0, shaftThickness, 0);
  shaftGrad.addColorStop(0, '#1A1110'); // Dark edge
  shaftGrad.addColorStop(0.5, '#4A322C'); // Polished center
  shaftGrad.addColorStop(1, '#1A1110');
  
  ctx.fillStyle = shaftGrad;
  ctx.beginPath();
  ctx.roundRect(-shaftThickness / 2, topY, shaftThickness, shaftLength, 2);
  ctx.fill();
  ctx.stroke(); // Sharp outline

  // Bronze/Gold spiral wrappings along the shaft
  ctx.fillStyle = '#D4AF37'; // Gold
  for (let i = topY + 15; i < bottomY - 5; i += 10) {
    ctx.beginPath();
    ctx.moveTo(-shaftThickness / 2 - 1, i);
    ctx.lineTo(shaftThickness / 2 + 1, i + 3);
    ctx.lineTo(shaftThickness / 2 + 1, i + 6);
    ctx.lineTo(-shaftThickness / 2 - 1, i + 3);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Majestic Base Pommel
  const goldGrad = ctx.createLinearGradient(-8, 0, 8, 0);
  goldGrad.addColorStop(0, '#B8860B');
  goldGrad.addColorStop(0.5, '#FFF8DC');
  goldGrad.addColorStop(1, '#B8860B');
  
  ctx.fillStyle = goldGrad;
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#3A2B00';
  ctx.beginPath();
  ctx.ellipse(0, bottomY + 2, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-3, bottomY + 7);
  ctx.lineTo(3, bottomY + 7);
  ctx.lineTo(0, bottomY + 14); // Sharp point
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Ornate Asymmetrical Crown Headpiece (Gold/Bronze)
  ctx.fillStyle = goldGrad;
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#3A2B00';

  // Base socket
  ctx.beginPath();
  ctx.moveTo(-shaftThickness / 2 - 2, topY + 8);
  ctx.lineTo(shaftThickness / 2 + 2, topY + 8);
  ctx.lineTo(shaftThickness / 2 + 5, topY);
  ctx.lineTo(-shaftThickness / 2 - 5, topY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Large elegant crescent blade/wing (Left side)
  ctx.beginPath();
  ctx.moveTo(-4, topY);
  ctx.bezierCurveTo(-22, topY - 10, -28, topY - 35, -8, topY - 45); // Outer sweep
  ctx.bezierCurveTo(-14, topY - 35, -12, topY - 15, 0, topY - 10);  // Inner sweep
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Secondary sharp crescent (Right side - asymmetrical)
  ctx.beginPath();
  ctx.moveTo(4, topY);
  ctx.bezierCurveTo(18, topY - 5, 22, topY - 25, 6, topY - 32);
  ctx.bezierCurveTo(12, topY - 22, 10, topY - 10, 0, topY - 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Glowing Magical Crystal (Energy Core)
  const coreColor = fighter.stolenType && fighter.stolenColor ? fighter.stolenColor : '#39FF14'; // Neon Green
  const crystalCenterY = topY - 22;
  
  if (fighter.stolenType === 'normal') {
     // Draw Rubbick Tension Aura for Stolen Execute (Green)
     const tensionIntensity = 1.0; 
     const time = Date.now() / 150;
     const s = 1.0; 
     
     ctx.save();
     // Align with staff tip crystal
     ctx.translate(0, crystalCenterY); 
     
     // 1. Smooth Fade-in Dark Green Smoke
     const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 45 * s);
     auraGrad.addColorStop(0, `rgba(0, 180, 0, ${0.6 * tensionIntensity * baseAlpha})`);
     auraGrad.addColorStop(0.5, `rgba(0, 80, 0, ${0.3 * tensionIntensity * baseAlpha})`);
     auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
     
     ctx.fillStyle = auraGrad;
     for (let i = -1; i <= 2; i++) {
         const xOffset = i * 25 * s + Math.sin(time * 0.5 + i) * 10 * s;
         const yOffset = Math.cos(time * 0.5 + i * 2) * 8 * s;
         ctx.beginPath();
         ctx.ellipse(xOffset, yOffset, 40 * s, 25 * s, 0, 0, Math.PI * 2);
         ctx.fill();
     }
     
     // 2. Smoke-green Lightning Ascending
     ctx.lineCap = 'round';
     ctx.lineJoin = 'round';
     
     const numSparks = 4 + Math.floor(Math.random() * 3);
     for (let i = 0; i < numSparks; i++) {
         const isDark = Math.random() > 0.8;
         ctx.strokeStyle = isDark ? `rgba(0, 30, 0, ${0.9 * tensionIntensity * baseAlpha})` : `rgba(50, 255, ${50 + Math.random() * 50}, ${0.8 * tensionIntensity * baseAlpha})`;
         ctx.lineWidth = (isDark ? 2 : 1.5) * s;
         
         const barrelX = (Math.random() - 0.5) * 40 * s;
         
         const startY = (Math.random() > 0.5 ? 1 : -1) * (15 + Math.random() * 25) * s;
         const startX = barrelX + (Math.random() - 0.5) * 20 * s;
         
         ctx.beginPath();
         ctx.moveTo(startX, startY);
         
         let curX = startX;
         let curY = startY;
         const segments = 3;
         
         for (let j = 1; j <= segments; j++) {
             const t = j / segments;
             const targetX = startX + (barrelX - startX) * t;
             const targetY = startY * (1 - t);
             
             curX = targetX + (Math.random() - 0.5) * 10 * s;
             curY = targetY + (Math.random() - 0.5) * 10 * s;
             if (j === segments) {
                 curX = barrelX;
                 curY = 0;
             }
             ctx.lineTo(curX, curY);
         }
         ctx.stroke();
     }
     ctx.restore();
  }

  if (fighter.stolenType === 'gojo' && fighter.stolenWindUpTimer > 0) {
     const windupMax = 45;
     const progress = Math.min(1.0, Math.max(0, 1 - (fighter.stolenWindUpTimer / windupMax)));
     const time = Date.now();
     
     ctx.save();
     ctx.translate(0, crystalCenterY - 15);
     
     // ── 1. Sacred Arcane Fusion Seal (Concentric Rotating Magic Circles) ──
     const sealAlpha = Math.min(1.0, progress * 1.6) * baseAlpha * 0.90;
     const sealRadius = 24 + progress * 16;
     const sealRot = (time * 0.0035) * (1 + progress * 3.0);
     
     ctx.save();
     ctx.rotate(sealRot);
     ctx.strokeStyle = `rgba(0, 255, 100, ${sealAlpha * 0.85})`;
     ctx.lineWidth = 1.5;
     
     // Outer ring
     ctx.beginPath();
     ctx.arc(0, 0, sealRadius, 0, Math.PI * 2);
     ctx.stroke();
     
     // Inner geometric octagram ticks & concentric dashed ring
     ctx.strokeStyle = `rgba(180, 255, 210, ${sealAlpha * 0.65})`;
     ctx.beginPath();
     for (let k = 0; k < 8; k++) {
       const a = (k * Math.PI) / 4;
       ctx.moveTo(Math.cos(a) * (sealRadius * 0.65), Math.sin(a) * (sealRadius * 0.65));
       ctx.lineTo(Math.cos(a) * sealRadius, Math.sin(a) * sealRadius);
     }
     ctx.stroke();
     
     ctx.beginPath();
     ctx.arc(0, 0, sealRadius * 0.65, 0, Math.PI * 2);
     ctx.stroke();
     ctx.restore();

     // ── 2. Dual Essence Convergence (Cyan/Emerald Attraction + Lime/Green Repulsion) ──
     if (progress < 0.72) {
       const convP = progress / 0.72;
       const orbitDist = (1 - convP) * 38;
       const orbitAngle = time * 0.016 + progress * Math.PI * 4;
       
       // Essence 1: Cyan-Emerald (Lapse Attraction Essence)
       const e1X = Math.cos(orbitAngle) * orbitDist;
       const e1Y = Math.sin(orbitAngle) * orbitDist;
       const grad1 = ctx.createRadialGradient(e1X, e1Y, 0, e1X, e1Y, 14);
       grad1.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
       grad1.addColorStop(0.35, 'rgba(0, 255, 200, 0.85)');
       grad1.addColorStop(1, 'rgba(0, 150, 100, 0)');
       ctx.fillStyle = grad1;
       ctx.beginPath();
       ctx.arc(e1X, e1Y, 14, 0, Math.PI * 2);
       ctx.fill();

       // Essence 2: Lime-Green (Reversal Repulsion Essence)
       const e2X = Math.cos(orbitAngle + Math.PI) * orbitDist;
       const e2Y = Math.sin(orbitAngle + Math.PI) * orbitDist;
       const grad2 = ctx.createRadialGradient(e2X, e2Y, 0, e2X, e2Y, 14);
       grad2.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
       grad2.addColorStop(0.35, 'rgba(100, 255, 50, 0.85)');
       grad2.addColorStop(1, 'rgba(40, 180, 0, 0)');
       ctx.fillStyle = grad2;
       ctx.beginPath();
       ctx.arc(e2X, e2Y, 14, 0, Math.PI * 2);
       ctx.fill();

       // Inward spiraling energy spark lines
       ctx.strokeStyle = `rgba(180, 255, 200, ${0.75 * (1 - convP)})`;
       ctx.lineWidth = 1.3;
       for (let i = 0; i < 4; i++) {
         const sparkA = orbitAngle + (i * Math.PI) / 2;
         const sDist = orbitDist + 12 + Math.sin(time * 0.02 + i) * 6;
         ctx.beginPath();
         ctx.moveTo(Math.cos(sparkA) * sDist, Math.sin(sparkA) * sDist);
         ctx.lineTo(0, 0);
         ctx.stroke();
       }
     }

     // ── 3. Growing Compressed Green Hollow Purple Sphere ──
     if (progress >= 0.35) {
       const hollowProg = (progress - 0.35) / 0.65;
       const chargeR = 19 * Math.pow(hollowProg, 1.15);
       if (chargeR > 1) {
         drawGojoOrb(ctx, 0, 0, chargeR, time, 'green', hollowProg * 6);
       }
       
       // Expanding emerald energy shockwave ripple rings
       const ripplePhase = ((time * 0.06) % 1);
       const rippleR = chargeR + ripplePhase * 24 * hollowProg;
       ctx.strokeStyle = `rgba(0, 255, 120, ${(1 - ripplePhase) * 0.85 * hollowProg})`;
       ctx.lineWidth = 2.0;
       ctx.beginPath();
       ctx.arc(0, 0, rippleR, 0, Math.PI * 2);
       ctx.stroke();
     }

     // ── 4. Horizontal Anamorphic Flare & Plasma Discharge ──
     if (progress > 0.40) {
       const flareIntensity = Math.pow((progress - 0.40) / 0.60, 1.25);
       drawAnamorphicLensFlare(ctx, 0, 0, flareIntensity, 'green');
     }

     // ── 5. Chaotic Crackling Lightning Arcs to Staff Headpiece ──
     ctx.strokeStyle = `rgba(0, 255, 100, ${0.85 * progress})`;
     ctx.lineWidth = 1.5 + progress * 1.0;
     const numArcs = 3 + Math.floor(progress * 5);
     for (let i = 0; i < numArcs; i++) {
       const angle = Math.random() * Math.PI * 2;
       const maxArcDist = (16 + Math.random() * 26) * (0.6 + progress * 0.6);
       ctx.beginPath();
       ctx.moveTo(0, 0);
       const midX = Math.cos(angle) * (maxArcDist * 0.5) + (Math.random() - 0.5) * 8;
       const midY = Math.sin(angle) * (maxArcDist * 0.5) + (Math.random() - 0.5) * 8;
       ctx.lineTo(midX, midY);
       ctx.lineTo(Math.cos(angle) * maxArcDist, Math.sin(angle) * maxArcDist);
       ctx.stroke();
     }

     ctx.restore();
  }
  
  if (fighter.stolenWindUpTimer > 0 && fighter.stolenColor) {
    const pulse = Math.sin(Date.now() / 50) * 0.5 + 0.5; // rapid pulse
    
    // Draw an intense massive aura behind the crystal
    ctx.fillStyle = fighter.stolenColor;
    ctx.globalAlpha = baseAlpha * (0.5 + pulse * 0.5);
    ctx.beginPath();
    ctx.arc(0, crystalCenterY, 30 + pulse * 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = baseAlpha;
  }
  
  // Outer Diamond Crystal
  ctx.fillStyle = coreColor;
  ctx.globalAlpha = baseAlpha * 0.8;
  ctx.beginPath();
  ctx.moveTo(0, crystalCenterY - 18); // top tip
  ctx.lineTo(-9, crystalCenterY); // left point
  ctx.lineTo(0, crystalCenterY + 12); // bottom tip
  ctx.lineTo(9, crystalCenterY); // right point
  ctx.closePath();
  ctx.fill();
  
  // Inner Bright Core
  ctx.globalAlpha = baseAlpha * 1.0;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(0, crystalCenterY - 12);
  ctx.lineTo(-4, crystalCenterY);
  ctx.lineTo(0, crystalCenterY + 8);
  ctx.lineTo(4, crystalCenterY);
  ctx.closePath();
  ctx.fill();

  // 5. Rotating Energy Ring around the Crystal
  ctx.save();
  ctx.translate(0, crystalCenterY);
  ctx.rotate(Date.now() / -400); // Constant slow rotation
  ctx.strokeStyle = coreColor;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = baseAlpha * 0.6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 18, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
  
  // Tiny orbiting particles on the ring
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = baseAlpha * 0.9;
  ctx.beginPath();
  ctx.arc(18, 0, 2, 0, Math.PI * 2);
  ctx.arc(-18, 0, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 6. Glowing Arcane Runes etched on the shaft
  ctx.globalAlpha = baseAlpha;
  ctx.strokeStyle = coreColor;
  ctx.lineWidth = 1.5;
  
  // Diamond Rune
  ctx.beginPath();
  ctx.moveTo(0, topY + 30);
  ctx.lineTo(-2, topY + 33);
  ctx.lineTo(0, topY + 36);
  ctx.lineTo(2, topY + 33);
  ctx.closePath();
  ctx.stroke();

  // Crescent Rune
  ctx.beginPath();
  ctx.arc(0, topY + 45, 2.5, Math.PI * 0.2, Math.PI * 1.8);
  ctx.stroke();

  // ADD HANDS
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || fighter.hideHands;
  if (!shouldHideHands && !fighter.hideFrontHand) {
    ctx.save();
    ctx.fillStyle = '#00f7ff';
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000';
    ctx.globalAlpha = baseAlpha;
    
    const handR = getHandSize(6);
    if (fighter.stolenWindUpTimer > 0) {
      // Left hand
      ctx.beginPath();
      ctx.arc(-shaftThickness/2 - 4, 10, handR, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // Right hand
      ctx.beginPath();
      ctx.arc(shaftThickness/2 + 4, -10, handR, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else {
      // Single hand gripping the staff
      ctx.beginPath();
      ctx.arc(0, 5, handR, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

export function drawRubbickBolt(ctx, p) {
  if (!p || Number.isNaN(p.x) || Number.isNaN(p.y)) return;
  ctx.save();
  
  // Fade alpha if projectile is expiring / fading out
  if (p.fadingAlpha !== undefined) {
    ctx.globalAlpha *= Math.max(0, Math.min(1, p.fadingAlpha));
  }

  // 1. Draw glowing trail with particles along history
  if (p.history && p.history.length > 1) {
    const histLen = p.history.length;
    
    for (let i = 0; i < histLen - 1; i++) {
      const pt = p.history[i];
      const nextPt = p.history[i + 1];
      if (!pt || !nextPt || Number.isNaN(pt.x) || Number.isNaN(nextPt.x)) continue;
      
      // Calculate how "old" this segment is (0 = tail, 1 = head)
      const progress = (i + 1) / histLen;
      
      // Tapering width and fading alpha
      const currentRadius = p.r * 2.8 * progress;
      const alpha = progress * 0.65;
      
      // Outer ethereal green trail segment
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(nextPt.x, nextPt.y);
      ctx.strokeStyle = `rgba(57, 255, 20, ${alpha})`;
      ctx.lineWidth = currentRadius;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Inner bright streak segment
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(nextPt.x, nextPt.y);
      ctx.strokeStyle = `rgba(210, 255, 210, ${alpha * 1.5})`;
      ctx.lineWidth = currentRadius * 0.35;
      ctx.stroke();
      
      // Tiny sparkles along trail history
      if (i % 2 === 0) {
        const sparkCount = Math.floor(progress * 2.5);
        for (let s = 0; s < sparkCount; s++) {
          const randX = Math.sin(pt.x * 12.345 + s * 45) * p.r * 2.2;
          const randY = Math.cos(pt.y * 54.321 + s * 33) * p.r * 2.2;
          
          ctx.beginPath();
          const sparkSize = (Math.sin(pt.x + Date.now() / 100) * 0.5 + 1.0) * progress * 1.5;
          ctx.fillStyle = `rgba(255, 255, 255, ${progress})`;
          ctx.arc(pt.x + randX, pt.y + randY, sparkSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // 2. Draw the main diamond/teardrop core oriented in travel direction
  ctx.translate(p.x, p.y);
  const angle = (p.vx !== 0 || p.vy !== 0) 
    ? Math.atan2(p.vy, p.vx) 
    : (p.angle !== undefined ? p.angle : (p.rotation || 0));
  ctx.rotate(angle);

  // Concentric radiant emerald & cyan aura (Rule 11 compliant: NO shadowBlur)
  const glowR = p.r * 3.8;
  const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
  glowGrad.addColorStop(0, 'rgba(57, 255, 20, 0.45)');
  glowGrad.addColorStop(0.5, 'rgba(0, 230, 180, 0.20)');
  glowGrad.addColorStop(1, 'rgba(0, 255, 100, 0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, glowR, 0, Math.PI * 2);
  ctx.fill();

  // Sharp outer diamond crystal body with dark outline
  ctx.fillStyle = 'rgba(57, 255, 20, 0.95)';
  ctx.strokeStyle = 'rgba(10, 60, 20, 0.85)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(p.r * 3.2, 0); // sharp leading tip
  ctx.lineTo(p.r * 0.4, p.r * 1.6); // bottom wing
  ctx.lineTo(-p.r * 1.6, 0); // rear tail
  ctx.lineTo(p.r * 0.4, -p.r * 1.6); // top wing
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bright white-hot diamond core
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(p.r * 2.2, 0);
  ctx.lineTo(p.r * 0.3, p.r * 0.85);
  ctx.lineTo(-p.r * 0.8, 0);
  ctx.lineTo(p.r * 0.3, -p.r * 0.85);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function drawRubbickChargeEffect(ctx, x, y, gunAngle, beamCharge, r) {
  if (beamCharge <= 0) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle);

  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  // Position at the staff tip (roughly r + 75)
  const tipDist = r + 75;
  // Fallback to 60 if CONFIG.laser is not defined yet here
  const windupDuration = (typeof CONFIG !== 'undefined' && CONFIG.laser) ? CONFIG.laser.windupDuration : 60;
  const chargeNorm = Math.min(1, beamCharge / windupDuration);
  const glowRadius = 15 + chargeNorm * 35;
  const alpha = 0.2 + chargeNorm * 0.6;
  const time = Date.now() / 80;
  
  // Central concentrated energy core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(tipDist, 0, 3 + chargeNorm * 5, 0, Math.PI * 2);
  ctx.fill();

  // Expanding pulsing energy rings (Shockwaves at the tip)
  for (let i = 0; i < 3; i++) {
    const ringPhase = ((time * 0.5 + i * 0.33) % 1);
    ctx.beginPath();
    ctx.arc(tipDist, 0, glowRadius * ringPhase, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0, 255, 100, ${(1 - ringPhase) * alpha})`;
    ctx.lineWidth = 2 * (1 - ringPhase);
    ctx.stroke();
  }

  // ── Massive Sucking Particles Effect ──
  const particleCount = 25 + Math.floor(chargeNorm * 15);
  for (let i = 0; i < particleCount; i++) {
    const pPhase = ((time * 1.5 + i * 0.618) % 1); 
    const angleOffset = i * (Math.PI * 2 / particleCount) + (time * 0.2); 
    const inwardProgress = Math.pow(pPhase, 3);
    
    const maxDist = 180;
    const currentDist = maxDist * (1 - inwardProgress);
    
    const xPos = tipDist + Math.cos(angleOffset) * currentDist;
    const yPos = Math.sin(angleOffset) * currentDist;
    
    const tailLength = (10 + chargeNorm * 15) * (1 - inwardProgress);
    const tailDist = currentDist + tailLength;
    const xTail = tipDist + Math.cos(angleOffset) * tailDist;
    const yTail = Math.sin(angleOffset) * tailDist;

    ctx.beginPath();
    ctx.moveTo(xPos, yPos);
    ctx.lineTo(xTail, yTail);
    
    let streakAlpha = Math.min(1, inwardProgress * 2); 
    let color = (inwardProgress > 0.8) ? `rgba(255, 255, 255, ${streakAlpha})` : `rgba(0, 255, 50, ${streakAlpha})`;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = (1 + chargeNorm * 1.5) * (1 - Math.pow(inwardProgress, 8));
    ctx.stroke();
  }

  ctx.restore();
}

export const drawTricksterStaff = drawRubbickStaff;
export const drawTricksterBolt = drawRubbickBolt;
export const drawTricksterChargeEffect = drawRubbickChargeEffect;

