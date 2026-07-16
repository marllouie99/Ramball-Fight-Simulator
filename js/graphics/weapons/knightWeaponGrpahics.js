export function drawGrayShield(ctx, x, y, gunAngle, blockFlashTimer, dashState, r, dashGlowFade = 0, shieldVisualOffset = -Math.PI / 2) {
  ctx.save();
  ctx.translate(x, y);
  const shieldAngle = gunAngle + shieldVisualOffset;
  ctx.rotate(shieldAngle);
  ctx.translate(r + 12, 0); 

  const shieldScale = 1.8; 

  // Modern Sci-Fi Palette
  const armorDark = '#1f2124';
  const armorMid = '#2a2d34';
  const armorLight = '#414652';
  const outline = '#0a0a0c';
  
  let neonCore = '#ffd700'; // Bright gold
  let neonGlow = 'rgba(255, 180, 0, 0.7)'; // Amber glow

  if (blockFlashTimer > 0) {
    neonCore = '#ffffff';
    neonGlow = 'rgba(255, 255, 255, 0.9)';
  } else if (dashState === 'charging') {
    neonCore = `hsl(45, 90%, ${60 + 20 * Math.sin(Date.now() / 80)}%)`;
    neonGlow = `hsla(45, 100%, 50%, ${0.5 + 0.3 * Math.sin(Date.now() / 80)})`;
  } else if (dashState === 'dashing') {
    neonCore = '#ffea75';
    neonGlow = 'rgba(255, 230, 100, 0.8)';
  }

  // CHARGING/DASHING VISUAL EFFECTS
  if (dashGlowFade > 0) {
    ctx.save();
    ctx.globalAlpha = dashGlowFade; 
    
    // 1. Shield Shake
    if (dashState === 'charging') {
      const shake = 2.5;
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    
    // 2. Neon Hexagonal Pulse Aura
    const pulse = (Math.sin(Date.now() / 60) + 1) / 2; 
    ctx.strokeStyle = neonGlow;
    ctx.lineWidth = (3 + 6 * pulse) * shieldScale;
    
    ctx.beginPath();
    ctx.moveTo(0, -18 * shieldScale);
    ctx.lineTo(16 * shieldScale, -8 * shieldScale);
    ctx.lineTo(12 * shieldScale, 18 * shieldScale);
    ctx.lineTo(0, 28 * shieldScale);
    ctx.lineTo(-12 * shieldScale, 18 * shieldScale);
    ctx.lineTo(-16 * shieldScale, -8 * shieldScale);
    ctx.closePath();
    ctx.stroke();

    // 3. Digital Crackling Energy Lines
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 20; 
      const len = 8 + Math.random() * 15;   
      ctx.moveTo(Math.cos(ang) * dist * shieldScale, Math.sin(ang) * dist * shieldScale);
      ctx.lineTo(Math.cos(ang+0.1) * (dist - len/2) * shieldScale, Math.sin(ang+0.1) * (dist - len/2) * shieldScale);
      ctx.lineTo(Math.cos(ang) * (dist - len) * shieldScale, Math.sin(ang) * (dist - len) * shieldScale);
    }
    ctx.lineWidth = (1 + Math.random() * 2) * shieldScale;
    ctx.strokeStyle = neonCore;
    ctx.stroke();
    ctx.restore();
  }

  // BASE SHIELD: Hexagonal/Angular Riot Shield Profile
  ctx.beginPath();
  ctx.moveTo(0, -16 * shieldScale);
  ctx.lineTo(14 * shieldScale, -8 * shieldScale);
  ctx.lineTo(10 * shieldScale, 16 * shieldScale);
  ctx.lineTo(0, 24 * shieldScale);
  ctx.lineTo(-10 * shieldScale, 16 * shieldScale);
  ctx.lineTo(-14 * shieldScale, -8 * shieldScale);
  ctx.closePath();

  const shieldGradient = ctx.createLinearGradient(-14 * shieldScale, -16 * shieldScale, 14 * shieldScale, 24 * shieldScale);
  shieldGradient.addColorStop(0, armorLight);
  shieldGradient.addColorStop(0.5, armorMid);
  shieldGradient.addColorStop(1, armorDark);
  ctx.fillStyle = shieldGradient;
  ctx.fill();
  
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.5 * shieldScale;
  ctx.lineJoin = 'miter';
  ctx.stroke();

  // INNER ARMOR PLATING
  ctx.beginPath();
  ctx.moveTo(0, -12 * shieldScale);
  ctx.lineTo(10 * shieldScale, -6 * shieldScale);
  ctx.lineTo(7 * shieldScale, 13 * shieldScale);
  ctx.lineTo(0, 19 * shieldScale);
  ctx.lineTo(-7 * shieldScale, 13 * shieldScale);
  ctx.lineTo(-10 * shieldScale, -6 * shieldScale);
  ctx.closePath();
  ctx.fillStyle = armorDark;
  ctx.fill();
  ctx.lineWidth = 1 * shieldScale;
  ctx.stroke();

  // Sci-Fi Tech Panel Lines (cutting across the armor)
  ctx.beginPath();
  ctx.moveTo(-9 * shieldScale, -2 * shieldScale);
  ctx.lineTo(9 * shieldScale, -2 * shieldScale);
  
  ctx.moveTo(0, 19 * shieldScale);
  ctx.lineTo(0, 12 * shieldScale);
  
  ctx.moveTo(-7 * shieldScale, 13 * shieldScale);
  ctx.lineTo(-4 * shieldScale, 8 * shieldScale);
  
  ctx.moveTo(7 * shieldScale, 13 * shieldScale);
  ctx.lineTo(4 * shieldScale, 8 * shieldScale);
  
  ctx.strokeStyle = outline;
  ctx.lineWidth = 0.5 * shieldScale;
  ctx.stroke();

  // Inner holographic edge wireframe
  ctx.beginPath();
  ctx.moveTo(0, -10 * shieldScale);
  ctx.lineTo(8 * shieldScale, -5 * shieldScale);
  ctx.lineTo(5 * shieldScale, 11 * shieldScale);
  ctx.lineTo(0, 16 * shieldScale);
  ctx.lineTo(-5 * shieldScale, 11 * shieldScale);
  ctx.lineTo(-8 * shieldScale, -5 * shieldScale);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255, 180, 0, 0.3)';
  ctx.lineWidth = 1 * shieldScale;
  ctx.stroke();

  // GLOWING NEON ENERGY REACTOR CORE
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Bloom effect for the core
  ctx.shadowBlur = 10 * shieldScale;
  ctx.shadowColor = '#ff8800';

  // Outer emitter ring
  ctx.beginPath();
  ctx.arc(0, 4 * shieldScale, 4.5 * shieldScale, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffaa00';
  ctx.lineWidth = 1 * shieldScale;
  ctx.stroke();
  
  // Neon circuit lines emitting from the reactor
  ctx.beginPath();
  ctx.moveTo(0, -0.5 * shieldScale);
  ctx.lineTo(0, -8 * shieldScale);
  
  ctx.moveTo(4.5 * shieldScale, 4 * shieldScale);
  ctx.lineTo(8 * shieldScale, 4 * shieldScale);
  ctx.lineTo(10 * shieldScale, 0);

  ctx.moveTo(-4.5 * shieldScale, 4 * shieldScale);
  ctx.lineTo(-8 * shieldScale, 4 * shieldScale);
  ctx.lineTo(-10 * shieldScale, 0);

  ctx.moveTo(0, 8.5 * shieldScale);
  ctx.lineTo(0, 15 * shieldScale);
  
  ctx.strokeStyle = neonCore;
  ctx.lineWidth = 2 * shieldScale;
  ctx.stroke();

  // White-hot reactor center
  ctx.beginPath();
  ctx.arc(0, 4 * shieldScale, 2.5 * shieldScale, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.restore();

  // Tech Decals on the outer rim (Warning stripes/markers)
  ctx.fillStyle = '#ffaa00';
  ctx.beginPath();
  ctx.moveTo(11 * shieldScale, -8 * shieldScale);
  ctx.lineTo(13 * shieldScale, -7 * shieldScale);
  ctx.lineTo(13 * shieldScale, -5 * shieldScale);
  ctx.lineTo(11 * shieldScale, -6 * shieldScale);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-11 * shieldScale, -8 * shieldScale);
  ctx.lineTo(-13 * shieldScale, -7 * shieldScale);
  ctx.lineTo(-13 * shieldScale, -5 * shieldScale);
  ctx.lineTo(-11 * shieldScale, -6 * shieldScale);
  ctx.fill();

  // Mechanical vent details
  ctx.fillStyle = outline;
  const vents = [
    [0, -14], [8, 14], [0, 21], [-8, 14]
  ];
  for (let pos of vents) {
    ctx.beginPath();
    ctx.rect((pos[0] - 1) * shieldScale, (pos[1] - 0.5) * shieldScale, 2 * shieldScale, 1 * shieldScale);
    ctx.fill();
  }

  // HONEYCOMB ENERGY BARRIER (Fades in when blocking/raised)
  // shieldVisualOffset interpolates to 0 when raised, -Math.PI/2 when resting
  const barrierAlpha = Math.max(0, 1 - Math.abs(shieldVisualOffset) / (Math.PI / 4));
  
  if (barrierAlpha > 0.01 || blockFlashTimer > 0) {
    ctx.save();
    
    // Boost glow and opacity when actively absorbing a hit
    const flashBoost = blockFlashTimer > 0 ? (blockFlashTimer / 10) : 0;
    const finalAlpha = Math.min(1, barrierAlpha + flashBoost * 2);
    
    ctx.globalAlpha = finalAlpha;
    
    // Scale up slightly to make it look like a projected hologram hovering in front
    const hoverScale = 1.05 + flashBoost * 0.1;
    ctx.scale(hoverScale, hoverScale);

    // Base state is a crisp, clean, thin-lined hologram without heavy glow
    ctx.shadowBlur = (1 + flashBoost * 14) * shieldScale;
    ctx.shadowColor = '#ffaa00';
    
    ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + flashBoost * 0.5})`;
    ctx.lineWidth = (1.0 + flashBoost * 1.5) * shieldScale;
    ctx.fillStyle = `rgba(255, 180, 0, ${0.05 + flashBoost * 0.35})`;

    const hexSize = 4.5 * shieldScale;
    const hexW = Math.sqrt(3) * hexSize;
    const hexH = 2 * hexSize;
    const yOffset = hexH * 0.75;

    ctx.beginPath();
    const drawHex = (cx, cy) => {
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3 + Math.PI / 6; // Pointy topped
        const px = cx + Math.cos(angle) * hexSize;
        const py = cy + Math.sin(angle) * hexSize;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    // Draw the honeycomb grid tailored to the shield's shape
    for (let row = -3; row <= 4; row++) {
      let cols = Math.abs(row) % 2 === 0 ? 5 : 4; 
      
      // Taper grid width at the top and bottom to form a shield profile
      if (row === -3) cols = 3;
      if (row === 3) cols = 3;
      if (row === 4) cols = 2;
      
      let startX = -(cols - 1) * hexW / 2;
      for (let col = 0; col < cols; col++) {
        drawHex(startX + col * hexW, row * yOffset + 2 * shieldScale); 
      }
    }
    
    ctx.fill();
    ctx.stroke();
    
    ctx.restore();
  }

  ctx.restore();
}

function drawSwordBase(ctx, swordScale, isBroken, isTrail = false) {
  // Sci-Fi Palette
  const armorDark = '#1a1c20';
  const armorMid = '#2a2d34';
  const outline = '#0a0a0c';
  
  const neonCore = '#ffffff'; 
  const neonEdge = '#ffb300'; // Bright amber/gold edge

  // 1. PLASMA BLADE
  if (isBroken) {
    ctx.beginPath();
    ctx.moveTo(0, -3 * swordScale);
    ctx.lineTo(15 * swordScale, -3 * swordScale);
    ctx.lineTo(20 * swordScale, 0); 
    ctx.lineTo(15 * swordScale, 3 * swordScale);
    ctx.lineTo(0, 3 * swordScale);
    ctx.closePath();

    const bladeGradient = ctx.createLinearGradient(0, -3 * swordScale, 20 * swordScale, 3 * swordScale);
    bladeGradient.addColorStop(0, neonEdge);
    bladeGradient.addColorStop(0.5, neonCore); 
    bladeGradient.addColorStop(1, neonEdge);
    ctx.fillStyle = bladeGradient;
    ctx.fill();

    // Broken Dark Metal Spine
    ctx.beginPath();
    ctx.moveTo(0, -4 * swordScale);
    ctx.lineTo(10 * swordScale, -4 * swordScale);
    ctx.lineTo(15 * swordScale, 0); 
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = armorDark;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1 * swordScale;
    ctx.stroke();

    // Sputtering energy edge with intense multi-layered glow
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(15 * swordScale, 0);
    ctx.lineTo(20 * swordScale, 0);
    ctx.lineTo(15 * swordScale, 4 * swordScale);
    ctx.lineTo(0, 4 * swordScale);
    ctx.closePath();
    
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (!isTrail) {
      // 1. Wide ambient glow
      ctx.strokeStyle = 'rgba(255, 150, 0, 0.2)';
      ctx.lineWidth = 14 * swordScale;
      ctx.stroke();

      // 2. Intense tight glow with bloom
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
      ctx.lineWidth = 6 * swordScale;
      ctx.shadowBlur = 12 * swordScale;
      ctx.shadowColor = '#ff8800';
      ctx.stroke();
    } else {
      // Simplified neon core for trails to massively boost FPS
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.lineWidth = 4 * swordScale;
      ctx.stroke();
    }

    // 3. Sharp inner edge
    ctx.shadowBlur = 0;
    ctx.strokeStyle = neonEdge;
    ctx.lineWidth = 2.5 * swordScale;
    ctx.stroke();
    
    // 4. White-hot searing core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8 * swordScale;
    ctx.stroke();
    
    ctx.restore();
    
    // Sparks
    ctx.beginPath();
    ctx.moveTo(20 * swordScale, 0);
    ctx.lineTo(24 * swordScale, -2 * swordScale);
    ctx.moveTo(15 * swordScale, 4 * swordScale);
    ctx.lineTo(18 * swordScale, 6 * swordScale);
    ctx.strokeStyle = neonCore;
    ctx.lineWidth = 1 * swordScale;
    ctx.stroke();

  } else {
    // Full Plasma Blade
    ctx.beginPath();
    ctx.moveTo(0, -3 * swordScale);
    ctx.lineTo(60 * swordScale, -3 * swordScale);
    ctx.lineTo(70 * swordScale, 0); // Angular tip
    ctx.lineTo(60 * swordScale, 3 * swordScale);
    ctx.lineTo(0, 3 * swordScale);
    ctx.closePath();

    const bladeGradient = ctx.createLinearGradient(0, -3 * swordScale, 70 * swordScale, 3 * swordScale);
    bladeGradient.addColorStop(0, neonEdge);
    bladeGradient.addColorStop(0.3, neonCore); 
    bladeGradient.addColorStop(1, neonEdge);
    ctx.fillStyle = bladeGradient;
    ctx.fill();

    // Dark Metal Spine on top
    ctx.beginPath();
    ctx.moveTo(0, -4 * swordScale);
    ctx.lineTo(55 * swordScale, -4 * swordScale);
    ctx.lineTo(65 * swordScale, 0); 
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = armorDark;
    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1 * swordScale;
    ctx.stroke();

    // Glowing energy edge outline with intense multi-layered bloom
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(65 * swordScale, 0);
    ctx.lineTo(70 * swordScale, 0);
    ctx.lineTo(60 * swordScale, 4 * swordScale);
    ctx.lineTo(0, 4 * swordScale);
    ctx.closePath();
    
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (!isTrail) {
      // 1. Wide ambient glow
      ctx.strokeStyle = 'rgba(255, 150, 0, 0.2)';
      ctx.lineWidth = 16 * swordScale;
      ctx.stroke();

      // 2. Intense tight glow with bloom
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
      ctx.lineWidth = 8 * swordScale;
      ctx.shadowBlur = 15 * swordScale;
      ctx.shadowColor = '#ff8800';
      ctx.stroke();
    } else {
      // Simplified neon core for trails to massively boost FPS
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.lineWidth = 5 * swordScale;
      ctx.stroke();
    }

    // 3. Sharp inner edge
    ctx.shadowBlur = 0;
    ctx.strokeStyle = neonEdge;
    ctx.lineWidth = 2.5 * swordScale;
    ctx.stroke();
    
    // 4. White-hot searing core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1 * swordScale;
    ctx.stroke();
    
    ctx.restore();
    
    // High-tech circuit notches on spine
    ctx.strokeStyle = neonEdge;
    ctx.lineWidth = 1 * swordScale;
    for(let i = 15; i < 45; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i * swordScale, -3 * swordScale);
        ctx.lineTo((i + 3) * swordScale, 0);
        ctx.stroke();
    }
  }

  // 2. HILT / GRIP (Modern cylindrical)
  ctx.fillStyle = armorDark;
  ctx.fillRect(-22 * swordScale, -2.5 * swordScale, 18 * swordScale, 5 * swordScale);
  ctx.strokeStyle = outline;
  ctx.strokeRect(-22 * swordScale, -2.5 * swordScale, 18 * swordScale, 5 * swordScale);

  // Neon grip rings
  ctx.strokeStyle = neonEdge;
  ctx.lineWidth = 1.5 * swordScale;
  ctx.beginPath();
  for(let i = -19; i <= -7; i += 4) {
    ctx.moveTo(i * swordScale, -2.5 * swordScale);
    ctx.lineTo(i * swordScale, 2.5 * swordScale);
  }
  ctx.stroke();

  // Pommel (Angular counterweight)
  ctx.beginPath();
  ctx.moveTo(-22 * swordScale, -3.5 * swordScale);
  ctx.lineTo(-26 * swordScale, -1.5 * swordScale);
  ctx.lineTo(-26 * swordScale, 1.5 * swordScale);
  ctx.lineTo(-22 * swordScale, 3.5 * swordScale);
  ctx.closePath();
  ctx.fillStyle = armorMid;
  ctx.fill();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.5 * swordScale;
  ctx.stroke();

  // 3. SCIFI CROSSGUARD / EMITTER
  ctx.fillStyle = armorMid;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.5 * swordScale;

  // Swept-back angular emitter module
  ctx.beginPath();
  ctx.moveTo(-2 * swordScale, -6 * swordScale);
  ctx.lineTo(6 * swordScale, -8 * swordScale);
  ctx.lineTo(10 * swordScale, -5 * swordScale); // Forward swept
  ctx.lineTo(4 * swordScale, -2 * swordScale);
  // Bottom side
  ctx.lineTo(4 * swordScale, 2 * swordScale);
  ctx.lineTo(10 * swordScale, 5 * swordScale);
  ctx.lineTo(6 * swordScale, 8 * swordScale);
  ctx.lineTo(-2 * swordScale, 6 * swordScale);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing emitter core window
  ctx.fillStyle = neonCore;
  ctx.beginPath();
  ctx.moveTo(2 * swordScale, -3 * swordScale);
  ctx.lineTo(6 * swordScale, -5 * swordScale);
  ctx.lineTo(4 * swordScale, -2 * swordScale);
  ctx.lineTo(4 * swordScale, 2 * swordScale);
  ctx.lineTo(6 * swordScale, 5 * swordScale);
  ctx.lineTo(2 * swordScale, 3 * swordScale);
  ctx.closePath();
  ctx.fill();
}

export function drawGraySword(ctx, x, y, gunAngle, r, dashState = null, isTrail = false) {
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
  drawSwordBase(ctx, 1.0, false, isTrail);
  ctx.restore();
}

export function drawGrayBrokenSword(ctx, x, y, gunAngle, r, dashState = null, isTrail = false) {
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
  drawSwordBase(ctx, 1.0, true, isTrail);
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
