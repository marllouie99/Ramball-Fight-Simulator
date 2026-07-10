export function drawSpikeSkin(ctx, x, y, r, angle, baseColor) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  
  // Flip vertically if facing left to keep lighting consistent
  if (Math.abs(angle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }

  // 1. Base metallic dome (matches the spike shadow/color theme)
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
  grad.addColorStop(0, '#ffffff'); // bright highlight
  grad.addColorStop(0.3, '#e0e5eb'); // silver metal
  grad.addColorStop(0.8, '#5a626b'); // shadow
  grad.addColorStop(1, '#1a1f24'); // edge outline
  
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  
  // 2. Armored Plating / Hexagon panels
  ctx.beginPath();
  const numPlates = 6;
  const angleStep = (Math.PI * 2) / numPlates;
  const innerR = r * 0.55;
  
  for (let i = 0; i < numPlates; i++) {
    const a = i * angleStep;
    const nextA = (i + 1) * angleStep;
    
    // Inner hexagon lines
    ctx.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    ctx.lineTo(Math.cos(nextA) * innerR, Math.sin(nextA) * innerR);
    
    // Radial lines from inner hexagon to the outer edge
    ctx.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  
  // Etch the lines into the metal
  ctx.strokeStyle = '#1a1f24';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Highlight on the etched lines for 3D depth
  ctx.beginPath();
  for (let i = 0; i < numPlates; i++) {
    const a = i * angleStep;
    const nextA = (i + 1) * angleStep;
    ctx.moveTo(Math.cos(a) * innerR + 1, Math.sin(a) * innerR + 1);
    ctx.lineTo(Math.cos(nextA) * innerR + 1, Math.sin(nextA) * innerR + 1);
    ctx.moveTo(Math.cos(a) * innerR + 1, Math.sin(a) * innerR + 1);
    ctx.lineTo(Math.cos(a) * r + 1, Math.sin(a) * r + 1);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // 3. Glowing core (keeps the fighter's base color identity)
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, innerR * 0.8);
  coreGrad.addColorStop(0, '#ffffff');
  coreGrad.addColorStop(0.4, baseColor);
  coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
  
  ctx.beginPath();
  ctx.arc(0, 0, innerR * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.fill();
  
  // 4. Core rim
  ctx.beginPath();
  ctx.arc(0, 0, innerR * 0.6, 0, Math.PI * 2);
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}
