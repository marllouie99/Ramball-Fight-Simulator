import { CONFIG } from '../../core/config.js';

export function drawBlueAimbotGun(ctx, x, y, gunAngle, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle);
  
  // Prevent upside-down graphics when aiming left
  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  ctx.translate(r + CONFIG.gun.baseOffset, 0);

  // Redesigned Ranger's Pistol based on the reference image
  // Main body color is very dark grey/black with texture
  // Accents are bright glowing cyan (#00ffff)

  const scale = 1.0;
  
  // Outer shadow for the whole gun to give it depth
  // OPTIMIZED: Removed shadowBlur (expensive operation)
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  // Base grip
  ctx.fillStyle = '#181b1d';
  ctx.beginPath();
  ctx.moveTo(0, 4 * scale);
  ctx.lineTo(-4 * scale, 12 * scale); // bottom back of grip
  ctx.lineTo(2 * scale, 14 * scale); // bottom front of grip
  ctx.lineTo(5 * scale, 4 * scale); // top front of grip
  ctx.closePath();
  ctx.fill();
  
  // Grip texture (stippling / dimples effect)
  ctx.fillStyle = '#0f1112';
  for(let i=0; i<4; i++) {
    for(let j=0; j<2; j++) {
      ctx.beginPath();
      ctx.arc(-1 * scale + j * 3 * scale, 7 * scale + i * 1.5 * scale, 0.5, 0, Math.PI*2);
      ctx.fill();
    }
  }

  // Back of the slide/body
  ctx.fillStyle = '#22262a';
  ctx.beginPath();
  ctx.moveTo(-6 * scale, -5 * scale);
  ctx.lineTo(0, -6 * scale);
  ctx.lineTo(6 * scale, -5 * scale);
  ctx.lineTo(4 * scale, 4 * scale);
  ctx.lineTo(-4 * scale, 4 * scale);
  ctx.closePath();
  ctx.fill();

  // Trigger guard
  ctx.strokeStyle = '#181b1d';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(4 * scale, 3 * scale);
  ctx.lineTo(8 * scale, 3 * scale);
  ctx.lineTo(8 * scale, 7 * scale);
  ctx.lineTo(4 * scale, 7 * scale);
  ctx.stroke();

  // Trigger
  ctx.fillStyle = '#3a4147';
  ctx.beginPath();
  ctx.moveTo(5 * scale, 3 * scale);
  ctx.lineTo(6 * scale, 5 * scale);
  ctx.lineTo(5 * scale, 6 * scale);
  ctx.closePath();
  ctx.fill();

  // Main Barrel Body
  ctx.fillStyle = '#1e2226';
  ctx.fillRect(-2 * scale, -4 * scale, 24 * scale, 7 * scale);
  
  // Slide detail (Top layer)
  ctx.fillStyle = '#2a2f34';
  ctx.beginPath();
  ctx.moveTo(-5 * scale, -5 * scale);
  ctx.lineTo(16 * scale, -5 * scale);
  ctx.lineTo(18 * scale, -3 * scale);
  ctx.lineTo(-4 * scale, -3 * scale);
  ctx.closePath();
  ctx.fill();

  // Barrel tip (Muzzle)
  ctx.fillStyle = '#111315';
  ctx.fillRect(20 * scale, -3 * scale, 4 * scale, 5 * scale);

  // Under-barrel section (rail)
  ctx.fillStyle = '#181b1d';
  ctx.fillRect(8 * scale, 3 * scale, 12 * scale, 2 * scale);

  // Reset shadow for glowing elements
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Dynamic pulsing effect
  const time = Date.now();
  const pulse = (Math.sin(time / 150) + 1) / 2; // oscillates between 0 and 1
  
  // Glowing Cyan Elements
  const glowAlpha = 0.6 + 0.4 * pulse;
  const glowColor = `rgba(0, 255, 255, ${glowAlpha})`;
  ctx.shadowColor = '#00ffff'; // keep blur color intense
  ctx.shadowBlur = (6 + 4 * pulse) * scale;
  ctx.fillStyle = glowColor;

  // 1. Diagonal glowing slits on the back slide
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    const startX = -3 * scale + i * 2.2 * scale;
    ctx.moveTo(startX, -4.5 * scale);
    ctx.lineTo(startX + 1.5 * scale, -4.5 * scale);
    ctx.lineTo(startX - 0.5 * scale, -1.5 * scale);
    ctx.lineTo(startX - 2 * scale, -1.5 * scale);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Circular glowing node above trigger
  ctx.beginPath();
  ctx.arc(4 * scale, 0, 1.5 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner white dot for extreme brightness on the circular node
  ctx.shadowBlur = (2 + 2 * pulse) * scale;
  ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + 0.2 * pulse})`;
  ctx.beginPath();
  ctx.arc(4 * scale, 0, 0.6 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  // Restore glow for next elements
  ctx.shadowBlur = (6 + 4 * pulse) * scale;
  ctx.fillStyle = glowColor;

  // 3. Glowing horizontal line on the front barrel side
  ctx.fillRect(10 * scale, -0.5 * scale, 8 * scale, 1 * scale);

  // 4. Small glowing dots on the barrel tip
  ctx.beginPath();
  ctx.arc(22 * scale, -1 * scale, 0.5 * scale, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(22 * scale, 1 * scale, 0.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  // 5. Holographic floating targeting rings ahead of the muzzle
  ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 + 0.7 * pulse})`;
  ctx.lineWidth = 0.8 * scale;
  ctx.shadowBlur = (4 + 2 * pulse) * scale;
  
  for (let i = 1; i <= 3; i++) {
    const ringOffset = 25 * scale + i * 3.5 * scale;
    const ringSizeY = (3 - i * 0.5) * scale;
    const ringSizeX = 1 * scale;
    
    ctx.beginPath();
    ctx.ellipse(ringOffset, -0.5 * scale, ringSizeX, ringSizeY, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Add tiny glowing nodes on the rings
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(ringOffset, -0.5 * scale - ringSizeY, 0.6 * scale, 0, Math.PI * 2);
    ctx.arc(ringOffset, -0.5 * scale + ringSizeY, 0.6 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
