import { state } from '../../core/state.js';

export function drawGetsugaSlash(ctx, p, isBlack) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  const owner = state.fighters && state.fighters[p.owner];
  const scale = owner ? Math.max(0.9, owner.r / 20) : 1.1;
  const lifeRatio = Math.max(0.2, (p.life || 30) / (p.maxLife || 30));

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const r = 26;
  
  // Outer crescent shape
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.6, Math.PI * 0.6, false);
  ctx.arc(r * 0.42, 0, r * 0.82, Math.PI * 0.55, -Math.PI * 0.55, true);
  ctx.closePath();

  // Color theme: Black/Crimson for Black Getsuga, Light Cyan/White for standard Getsuga
  ctx.fillStyle = isBlack ? `rgba(15, 5, 5, ${0.9 * lifeRatio})` : `rgba(0, 110, 255, ${0.5 * lifeRatio})`;
  ctx.fill();
  
  ctx.strokeStyle = isBlack ? `rgba(139, 0, 0, ${0.95 * lifeRatio})` : `rgba(0, 191, 255, ${0.8 * lifeRatio})`;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Glow core
  ctx.save();
  ctx.scale(0.85, 0.85);
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI * 0.55, Math.PI * 0.55, false);
  ctx.arc(r * 0.42, 0, r * 0.82, Math.PI * 0.5, -Math.PI * 0.5, true);
  ctx.closePath();
  ctx.fillStyle = isBlack ? `rgba(220, 10, 10, ${0.95 * lifeRatio})` : `rgba(255, 255, 255, ${0.9 * lifeRatio})`;
  ctx.fill();
  ctx.restore();

  // Center white line core
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, -Math.PI * 0.52, Math.PI * 0.52, false);
  ctx.stroke();

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
