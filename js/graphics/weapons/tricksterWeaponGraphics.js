/**
 * Trickster's Weapon: The Arcane Staff
 * A long, slender shaft with a complex, ornate, asymmetrical headpiece.
 * Features floating/segmented components, a glowing green magical crystal,
 * gold/bronze ornamentation, and arcane runes.
 */

export function drawTricksterStaff(ctx, fighter) {
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
  
  if (fighter.stolenWindUpTimer > 0) {
    // Lift staff directly in front with both hands
    // A slight shake effect for intense channeling
    const shakeX = (Math.random() - 0.5) * 3;
    const shakeY = (Math.random() - 0.5) * 3;
    ctx.translate(fighter.r + 15 + shakeX, shakeY);
    ctx.rotate(Math.PI / 2); // Point straight forward
  } else {
    // Position the staff in the "right hand" (off to the side and slightly forward)
    ctx.translate(fighter.r * 0.4 + thrustOffset, fighter.r * 0.85 + idleHover);
    ctx.rotate(Math.PI * 0.3 + swingAngle);
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
  
  // Pommel sphere
  ctx.beginPath();
  ctx.arc(0, bottomY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // Pommel spike
  ctx.beginPath();
  ctx.moveTo(-4, bottomY + 3);
  ctx.lineTo(4, bottomY + 3);
  ctx.lineTo(0, bottomY + 12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 3. Ornate Asymmetrical Headpiece
  // Main Gold Casing
  ctx.fillStyle = goldGrad; 
  ctx.beginPath();
  ctx.moveTo(-shaftThickness / 2, topY);
  ctx.lineTo(-15, topY - 12);
  ctx.lineTo(-10, topY - 25);
  ctx.lineTo(0, topY - 18);
  ctx.lineTo(18, topY - 28); // Sharp sweeping wing
  ctx.lineTo(10, topY - 8);
  ctx.lineTo(shaftThickness / 2, topY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Floating geometric shards (Orbiting components)
  const floatOffset = Math.sin(Date.now() / 200) * 3; // stronger hover
  ctx.fillStyle = '#FFD700';
  
  // Left floating shard
  ctx.beginPath();
  ctx.moveTo(-20, topY - 15 + floatOffset);
  ctx.lineTo(-15, topY - 28 + floatOffset);
  ctx.lineTo(-24, topY - 24 + floatOffset);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Right floating shard
  ctx.beginPath();
  ctx.moveTo(22, topY - 12 - floatOffset);
  ctx.lineTo(30, topY - 22 - floatOffset);
  ctx.lineTo(18, topY - 26 - floatOffset);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Glowing Magical Crystal (Energy Core)
  const coreColor = fighter.stolenType && fighter.stolenColor ? fighter.stolenColor : '#39FF14'; // Neon Green
  const crystalCenterY = topY - 22;
  
  if (fighter.stolenType === 'normal') {
     // Draw Trickster Tension Aura for Stolen Execute (Green)
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
  
  if (fighter.stolenWindUpTimer > 0 && fighter.stolenColor) {
    const pulse = Math.sin(Date.now() / 50) * 0.5 + 0.5; // rapid pulse
    ctx.shadowColor = fighter.stolenColor;
    ctx.shadowBlur = 25 + pulse * 40; // Huge blur
    
    // Draw an intense massive aura behind the crystal
    ctx.fillStyle = fighter.stolenColor;
    ctx.globalAlpha = baseAlpha * (0.5 + pulse * 0.5);
    ctx.beginPath();
    ctx.arc(0, crystalCenterY, 30 + pulse * 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = baseAlpha;
  } else {
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = 15 + Math.sin(Date.now() / 150) * 8; // Deep pulsating glow
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
  ctx.shadowBlur = 0;
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
  ctx.shadowBlur = 5;
  ctx.shadowColor = coreColor;
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

  // ADD HANDS (NEW CODE)
  ctx.fillStyle = fighter._def ? fighter._def.color : '#8A2BE2'; // Trickster's purple
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#000';
  ctx.globalAlpha = baseAlpha;
  ctx.shadowBlur = 0; // reset shadow for hand
  
  if (fighter.stolenWindUpTimer > 0) {
    // Left hand
    ctx.beginPath();
    ctx.arc(-shaftThickness/2 - 4, 10, 6, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Right hand
    ctx.beginPath();
    ctx.arc(shaftThickness/2 + 4, -10, 6, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  } else {
    // Single hand gripping the staff
    ctx.beginPath();
    ctx.arc(0, 5, 6, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }

  ctx.restore();
}
