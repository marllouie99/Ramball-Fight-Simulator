export function drawGrayShield(ctx, x, y, gunAngle, blockFlashTimer, dashState, r, dashGlowFade = 0, shieldVisualOffset = -Math.PI / 2) {
  ctx.save();
  ctx.translate(x, y);
  const shieldAngle = gunAngle + shieldVisualOffset;
  ctx.rotate(shieldAngle);
  ctx.translate(r + 12, 0); 

  const shieldScale = 1.8; 

  const goldLight = '#fff085';
  let goldMid = '#e6b927';
  const goldDark = '#b38212';
  const goldShadow = '#593c00';

  if (blockFlashTimer > 0) {
    goldMid = '#ffffff';
  } else if (dashState === 'charging') {
    goldMid = `hsl(45, 90%, ${60 + 20 * Math.sin(Date.now() / 80)}%)`;
  } else if (dashState === 'dashing') {
    goldMid = '#ffea75';
  }

  // Base Shield Shape (Sharp Kite/Heater Shield)
  ctx.beginPath();
  ctx.moveTo(0, -16 * shieldScale); // Top center peak
  ctx.lineTo(14 * shieldScale, -12 * shieldScale); // Top right corner
  // Right edge curving smoothly to bottom tip
  ctx.quadraticCurveTo(14 * shieldScale, 8 * shieldScale, 0, 26 * shieldScale);
  // Left edge curving smoothly to top left corner
  ctx.quadraticCurveTo(-14 * shieldScale, 8 * shieldScale, -14 * shieldScale, -12 * shieldScale);
  ctx.lineTo(0, -16 * shieldScale); // Back to top center peak
  ctx.closePath();

  // CHARGING/DASHING VISUAL EFFECTS (With smooth fade-out)
  if (dashGlowFade > 0) {
    ctx.save();
    ctx.globalAlpha = dashGlowFade; // Smoothly fade out the entire effect
    
    // 1. Violent Shield Shake (Only when charging up)
    if (dashState === 'charging') {
      const shake = 2.5;
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    
    // 2. Massive Golden Pulsing Aura
    const pulse = (Math.sin(Date.now() / 60) + 1) / 2; // Fast pulse 0 to 1
    // OPTIMIZED: Removed shadowBlur (expensive operation)
    ctx.strokeStyle = `rgba(255, 230, 50, ${0.5 + 0.5 * pulse})`;
    ctx.lineWidth = (3 + 6 * pulse) * shieldScale;
    ctx.stroke(); // Draw the glowing outline aura behind the shield

    // 3. Crackling Energy Lines
    ctx.beginPath();
    // Generate random energy lines every frame for a chaotic anime power-up look
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 20; // Start far
      const len = 8 + Math.random() * 15;   // Length of line
      ctx.moveTo(Math.cos(ang) * dist * shieldScale, Math.sin(ang) * dist * shieldScale);
      ctx.lineTo(Math.cos(ang) * (dist - len) * shieldScale, Math.sin(ang) * (dist - len) * shieldScale);
    }
    ctx.lineWidth = (1 + Math.random() * 2) * shieldScale;
    ctx.strokeStyle = `rgba(255, 255, 220, ${0.6 + 0.4 * Math.random()})`;
    // Add extra glow to the energy lines (OPTIMIZED: removed shadowBlur)
    ctx.stroke();
    
    ctx.restore();
  }

  const shieldGradient = ctx.createLinearGradient(-14 * shieldScale, -16 * shieldScale, 14 * shieldScale, 26 * shieldScale);
  shieldGradient.addColorStop(0, goldLight);
  shieldGradient.addColorStop(0.5, goldMid);
  shieldGradient.addColorStop(1, goldDark);
  ctx.fillStyle = shieldGradient;
  ctx.fill();
  
  ctx.strokeStyle = goldShadow;
  ctx.lineWidth = 2 * shieldScale;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Inner Gold Rim
  ctx.beginPath();
  ctx.moveTo(0, -13 * shieldScale);
  ctx.lineTo(11 * shieldScale, -10 * shieldScale);
  ctx.quadraticCurveTo(11 * shieldScale, 6 * shieldScale, 0, 22 * shieldScale);
  ctx.quadraticCurveTo(-11 * shieldScale, 6 * shieldScale, -11 * shieldScale, -10 * shieldScale);
  ctx.lineTo(0, -13 * shieldScale);
  ctx.closePath();
  ctx.strokeStyle = goldLight;
  ctx.lineWidth = 1.5 * shieldScale;
  ctx.stroke();

  // Center Raised Diamond/Kite
  ctx.beginPath();
  ctx.moveTo(0, -5 * shieldScale);
  ctx.lineTo(6 * shieldScale, 2 * shieldScale);
  ctx.lineTo(0, 12 * shieldScale);
  ctx.lineTo(-6 * shieldScale, 2 * shieldScale);
  ctx.closePath();
  
  const diamondGrad = ctx.createLinearGradient(-6 * shieldScale, -5 * shieldScale, 6 * shieldScale, 12 * shieldScale);
  diamondGrad.addColorStop(0, goldLight);
  diamondGrad.addColorStop(1, goldDark);
  ctx.fillStyle = diamondGrad;
  ctx.fill();
  ctx.strokeStyle = goldShadow;
  ctx.lineWidth = 1 * shieldScale;
  ctx.stroke();

  // Elegant geometric inner accents (replaces messy swirls)
  ctx.strokeStyle = goldDark;
  ctx.lineWidth = 1.2 * shieldScale;
  ctx.lineCap = 'round';
  
  ctx.beginPath();
  ctx.moveTo(7 * shieldScale, -6 * shieldScale);
  ctx.quadraticCurveTo(8 * shieldScale, 4 * shieldScale, 3 * shieldScale, 13 * shieldScale);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-7 * shieldScale, -6 * shieldScale);
  ctx.quadraticCurveTo(-8 * shieldScale, 4 * shieldScale, -3 * shieldScale, 13 * shieldScale);
  ctx.stroke();

  // Golden Studs along the rim
  ctx.fillStyle = goldLight;
  ctx.strokeStyle = goldShadow;
  ctx.lineWidth = 0.5 * shieldScale;
  const studPositions = [
    [0, -10], [9, -5], [5, 11], [0, 18], [-5, 11], [-9, -5]
  ];
  for (let pos of studPositions) {
    ctx.beginPath();
    ctx.arc(pos[0] * shieldScale, pos[1] * shieldScale, 1 * shieldScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawSwordBase(ctx, swordScale, isBroken) {
  const goldLight = '#fff085';
  const goldMid = '#e6b927';
  const goldDark = '#b38212';
  const goldShadow = '#593c00';
  const gripDark = '#2c241b';

  // 1. BLADE (drawn first so hilt overlays it)
  if (isBroken) {
    ctx.beginPath();
    ctx.moveTo(0, -6 * swordScale);
    ctx.lineTo(18 * swordScale, -4 * swordScale);
    ctx.lineTo(14 * swordScale, -2 * swordScale);
    ctx.lineTo(22 * swordScale, 0);
    ctx.lineTo(12 * swordScale, 2 * swordScale);
    ctx.lineTo(19 * swordScale, 5 * swordScale);
    ctx.lineTo(0, 6 * swordScale);
    ctx.closePath();
    
    const bladeGradient = ctx.createLinearGradient(0, -6 * swordScale, 22 * swordScale, 6 * swordScale);
    bladeGradient.addColorStop(0, goldLight);
    bladeGradient.addColorStop(1, goldDark);
    ctx.fillStyle = bladeGradient;
    ctx.fill();
    ctx.strokeStyle = goldShadow;
    ctx.lineWidth = 1.5 * swordScale;
    ctx.stroke();
  } else {
    // Full Blade
    ctx.beginPath();
    ctx.moveTo(0, -6 * swordScale);
    ctx.lineTo(55 * swordScale, -4 * swordScale);
    ctx.lineTo(70 * swordScale, 0);
    ctx.lineTo(55 * swordScale, 4 * swordScale);
    ctx.lineTo(0, 6 * swordScale);
    ctx.closePath();

    const bladeGradient = ctx.createLinearGradient(0, -6 * swordScale, 70 * swordScale, 6 * swordScale);
    bladeGradient.addColorStop(0, goldLight);
    bladeGradient.addColorStop(0.5, goldMid);
    bladeGradient.addColorStop(1, goldDark);
    ctx.fillStyle = bladeGradient;
    ctx.fill();
    ctx.strokeStyle = goldShadow;
    ctx.lineWidth = 1.5 * swordScale;
    ctx.stroke();

    // Blade center ridge
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(68 * swordScale, 0);
    ctx.strokeStyle = '#fff9d6'; 
    ctx.lineWidth = 1 * swordScale;
    ctx.stroke();
    
    // Golden runic diamond pattern on the blade base
    ctx.beginPath();
    ctx.moveTo(16 * swordScale, 0);
    ctx.lineTo(22 * swordScale, -3 * swordScale);
    ctx.lineTo(28 * swordScale, 0);
    ctx.lineTo(22 * swordScale, 3 * swordScale);
    ctx.closePath();
    ctx.fillStyle = goldLight;
    ctx.fill();
    ctx.strokeStyle = goldShadow;
    ctx.stroke();
  }

  // 2. POMMEL (Sharp angular cross)
  ctx.fillStyle = goldMid;
  ctx.strokeStyle = goldShadow;
  ctx.lineWidth = 1 * swordScale;
  
  const drawArm = (cx, cy, angle) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(1.5 * swordScale, -1.5 * swordScale);
    ctx.lineTo(5 * swordScale, -3.5 * swordScale);
    ctx.lineTo(7 * swordScale, 0);
    ctx.lineTo(5 * swordScale, 3.5 * swordScale);
    ctx.lineTo(1.5 * swordScale, 1.5 * swordScale);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };
  drawArm(-22 * swordScale, 0, Math.PI); // Back
  drawArm(-22 * swordScale, 0, -Math.PI/2); // Top
  drawArm(-22 * swordScale, 0, Math.PI/2); // Bottom
  
  // Pommel Center
  ctx.beginPath();
  ctx.arc(-22 * swordScale, 0, 2.5 * swordScale, 0, Math.PI * 2);
  ctx.fill(); 
  ctx.stroke();

  // 3. GRIP
  ctx.fillStyle = gripDark;
  ctx.fillRect(-20 * swordScale, -2.5 * swordScale, 16 * swordScale, 5 * swordScale);
  ctx.strokeRect(-20 * swordScale, -2.5 * swordScale, 16 * swordScale, 5 * swordScale);

  // Gold rings on grip ends
  ctx.fillStyle = goldMid;
  ctx.fillRect(-20 * swordScale, -3 * swordScale, 2 * swordScale, 6 * swordScale);
  ctx.strokeRect(-20 * swordScale, -3 * swordScale, 2 * swordScale, 6 * swordScale);
  ctx.fillRect(-6 * swordScale, -3 * swordScale, 2 * swordScale, 6 * swordScale);
  ctx.strokeRect(-6 * swordScale, -3 * swordScale, 2 * swordScale, 6 * swordScale);

  // Gold criss-cross on grip
  ctx.strokeStyle = goldDark;
  ctx.lineWidth = 1 * swordScale;
  ctx.beginPath();
  for(let i = -17; i <= -9; i += 4) {
    ctx.moveTo(i * swordScale, -2.5 * swordScale);
    ctx.lineTo((i + 3) * swordScale, 2.5 * swordScale);
    ctx.moveTo((i + 3) * swordScale, -2.5 * swordScale);
    ctx.lineTo(i * swordScale, 2.5 * swordScale);
  }
  ctx.stroke();

  // 4. CROSSGUARD
  const guardGrad = ctx.createLinearGradient(0, -18 * swordScale, 0, 18 * swordScale);
  guardGrad.addColorStop(0, goldLight);
  guardGrad.addColorStop(0.5, goldMid);
  guardGrad.addColorStop(1, goldDark);
  
  ctx.fillStyle = guardGrad;
  ctx.strokeStyle = goldShadow;
  ctx.lineWidth = 1 * swordScale;

  // Top straight architectural arm with diamond finial
  ctx.beginPath();
  ctx.moveTo(2 * swordScale, -4 * swordScale);
  ctx.lineTo(2 * swordScale, -8 * swordScale);
  ctx.lineTo(4 * swordScale, -8 * swordScale); // Step out
  ctx.lineTo(4 * swordScale, -11 * swordScale);
  ctx.lineTo(7 * swordScale, -14 * swordScale); // Flare right
  ctx.lineTo(0, -19 * swordScale); // Top point
  ctx.lineTo(-7 * swordScale, -14 * swordScale); // Flare left
  ctx.lineTo(-4 * swordScale, -11 * swordScale);
  ctx.lineTo(-4 * swordScale, -8 * swordScale); // Step in
  ctx.lineTo(-2 * swordScale, -8 * swordScale);
  ctx.lineTo(-2 * swordScale, -4 * swordScale);
  ctx.closePath();
  ctx.fill(); 
  ctx.stroke();
  
  // Bottom straight architectural arm with diamond finial
  ctx.beginPath();
  ctx.moveTo(2 * swordScale, 4 * swordScale);
  ctx.lineTo(2 * swordScale, 8 * swordScale);
  ctx.lineTo(4 * swordScale, 8 * swordScale); // Step out
  ctx.lineTo(4 * swordScale, 11 * swordScale);
  ctx.lineTo(7 * swordScale, 14 * swordScale); // Flare right
  ctx.lineTo(0, 19 * swordScale); // Bottom point
  ctx.lineTo(-7 * swordScale, 14 * swordScale); // Flare left
  ctx.lineTo(-4 * swordScale, 11 * swordScale);
  ctx.lineTo(-4 * swordScale, 8 * swordScale); // Step in
  ctx.lineTo(-2 * swordScale, 8 * swordScale);
  ctx.lineTo(-2 * swordScale, 4 * swordScale);
  ctx.closePath();
  ctx.fill(); 
  ctx.stroke();

  // Blade collar (forward jutting piece)
  ctx.beginPath();
  ctx.moveTo(3 * swordScale, -3 * swordScale);
  ctx.lineTo(12 * swordScale, -4 * swordScale);
  ctx.lineTo(8 * swordScale, 0);
  ctx.lineTo(12 * swordScale, 4 * swordScale);
  ctx.lineTo(3 * swordScale, 3 * swordScale);
  ctx.closePath();
  ctx.fill(); 
  ctx.stroke();

  // Central Block
  ctx.fillRect(-3 * swordScale, -4 * swordScale, 6 * swordScale, 8 * swordScale);
  ctx.strokeRect(-3 * swordScale, -4 * swordScale, 6 * swordScale, 8 * swordScale);

  // Cross embossed in center block
  ctx.fillStyle = goldLight;
  ctx.beginPath();
  ctx.moveTo(-1 * swordScale, -2 * swordScale);
  ctx.lineTo(1 * swordScale, 0);
  ctx.lineTo(-1 * swordScale, 2 * swordScale);
  ctx.lineTo(-3 * swordScale, 0);
  ctx.closePath();
  ctx.fill(); 
  ctx.stroke();
}

export function drawGraySword(ctx, x, y, gunAngle, r, dashState = null) {
  ctx.save();
  ctx.translate(x, y);
  if (dashState === 'charging' || dashState === 'dashing') {
    ctx.rotate(gunAngle);
    ctx.translate(r + 8, 16);
  } else {
    ctx.rotate(gunAngle + Math.PI / 2);
    ctx.translate(r + 12, 0); 
    ctx.rotate(-Math.PI / 2);
  }
  drawSwordBase(ctx, 1.0, false);
  ctx.restore();
}

export function drawGrayBrokenSword(ctx, x, y, gunAngle, r, dashState = null) {
  ctx.save();
  ctx.translate(x, y);
  if (dashState === 'charging' || dashState === 'dashing') {
    ctx.rotate(gunAngle);
    ctx.translate(r + 8, 16);
  } else {
    ctx.rotate(gunAngle + Math.PI / 2);
    ctx.translate(r + 12, 0); 
    ctx.rotate(-Math.PI / 2);
  }
  drawSwordBase(ctx, 1.0, true);
  ctx.restore();
}

export function drawGraySwordProjectile(ctx, x, y, angle, scale = 1.0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  
  // Add a glowing aura to the thrown sword (OPTIMIZED: removed shadowBlur)
  
  drawSwordBase(ctx, Math.max(0.4, scale), false);
  ctx.restore();
}
