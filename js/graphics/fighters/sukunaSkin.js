// ─────────────────────────────────────────────
// SUKUNA FIGHTER SKIN & FACIAL TATTOO VISUALS
// Recreates Ryomen Sukuna's iconic face markings
// ─────────────────────────────────────────────

export function drawSukunaBody(ctx, fighter) {
  const z = fighter.z || 0;
  const r = fighter.r;

  // Ground shadow when levitating
  if (z > 0) {
    const levFactor = Math.min(1.0, z / 35);
    ctx.save();
    ctx.translate(fighter.x, fighter.y);
    ctx.scale(1.0, 0.35);

    const shadowGlow = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.6);
    shadowGlow.addColorStop(0, `rgba(0, 0, 0, ${0.7 * levFactor})`);
    shadowGlow.addColorStop(0.5, `rgba(0, 0, 0, ${0.4 * levFactor})`);
    shadowGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
    ctx.fillStyle = shadowGlow;
    ctx.fill();

    ctx.restore();
  }

  ctx.save();
  ctx.translate(fighter.x, fighter.y - z);

  // Clip to fighter circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // 1. Skin Base (Pale crimson-tinged flesh tone)
  ctx.fillStyle = fighter.color || '#E8B4A2';
  ctx.fill();

  // Subtle shading gradient for 3D body volume
  const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r * 1.05);
  bodyGrad.addColorStop(0, 'rgba(255, 235, 225, 0.25)');
  bodyGrad.addColorStop(0.7, 'rgba(180, 80, 70, 0.15)');
  bodyGrad.addColorStop(1, 'rgba(60, 10, 10, 0.45)');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // ─────────────────────────────────────────────
  // SUKUNA FACE TATTOOS & MARKINGS
  // ─────────────────────────────────────────────
  ctx.fillStyle = '#0a0a0d'; // Deep high-contrast tattoo black
  ctx.strokeStyle = '#0a0a0d';

  // --- A. Top Hairline Spikes (3 downward teeth) ---
  ctx.beginPath();
  // Center spike
  ctx.moveTo(0, -r * 0.65);
  ctx.lineTo(-r * 0.12, -r * 0.95);
  ctx.lineTo(r * 0.12, -r * 0.95);
  ctx.closePath();
  // Left spike
  ctx.moveTo(-r * 0.28, -r * 0.70);
  ctx.lineTo(-r * 0.40, -r * 0.95);
  ctx.lineTo(-r * 0.18, -r * 0.95);
  ctx.closePath();
  // Right spike
  ctx.moveTo(r * 0.28, -r * 0.70);
  ctx.lineTo(r * 0.18, -r * 0.95);
  ctx.lineTo(r * 0.40, -r * 0.95);
  ctx.closePath();
  ctx.fill();

  // --- B. Forehead & Nose Bridge Markings (Dot + Chevrons) ---
  // Central Dot
  ctx.beginPath();
  ctx.arc(0, -r * 0.32, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Left Bracket ┌
  ctx.beginPath();
  ctx.lineWidth = Math.max(1.8, r * 0.07);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';
  ctx.moveTo(-r * 0.36, -r * 0.46);
  ctx.lineTo(-r * 0.20, -r * 0.46);
  ctx.lineTo(-r * 0.18, -r * 0.16);
  ctx.lineTo(-r * 0.28, -r * 0.14);
  ctx.stroke();

  // Right Bracket ┐
  ctx.beginPath();
  ctx.moveTo(r * 0.36, -r * 0.46);
  ctx.lineTo(r * 0.20, -r * 0.46);
  ctx.lineTo(r * 0.18, -r * 0.16);
  ctx.lineTo(r * 0.28, -r * 0.14);
  ctx.stroke();

  // --- C. Cheek Jagged Markings & Jawline Wrap (Left & Right) ---
  // Left Cheek Tattoo Branch
  ctx.beginPath();
  ctx.lineWidth = Math.max(2.2, r * 0.08);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';
  // Upper Jagged Branch (Lightning style)
  ctx.moveTo(-r * 0.38, -r * 0.08);
  ctx.lineTo(-r * 0.52, -r * 0.24);
  ctx.lineTo(-r * 0.46, -r * 0.32);
  ctx.lineTo(-r * 0.68, -r * 0.34);
  ctx.lineTo(-r * 0.60, -r * 0.18);
  ctx.lineTo(-r * 0.88, -r * 0.12);
  ctx.stroke();

  // Secondary lower branch connecting down to jaw
  ctx.beginPath();
  ctx.moveTo(-r * 0.60, -r * 0.18);
  ctx.lineTo(-r * 0.85, 0);
  ctx.lineTo(-r * 0.75, r * 0.48);
  ctx.lineTo(-r * 0.30, r * 0.66);
  ctx.stroke();

  // Right Cheek Tattoo Branch
  ctx.beginPath();
  // Upper Jagged Branch (Lightning style)
  ctx.moveTo(r * 0.38, -r * 0.08);
  ctx.lineTo(r * 0.52, -r * 0.24);
  ctx.lineTo(r * 0.46, -r * 0.32);
  ctx.lineTo(r * 0.68, -r * 0.34);
  ctx.lineTo(r * 0.60, -r * 0.18);
  ctx.lineTo(r * 0.88, -r * 0.12);
  ctx.stroke();

  // Secondary lower branch connecting down to jaw
  ctx.beginPath();
  ctx.moveTo(r * 0.60, -r * 0.18);
  ctx.lineTo(r * 0.85, 0);
  ctx.lineTo(r * 0.75, r * 0.48);
  ctx.lineTo(r * 0.30, r * 0.66);
  ctx.stroke();

  // Fill thick filled jaw band connecting left and right lower jawline
  ctx.beginPath();
  ctx.lineWidth = Math.max(2.5, r * 0.09);
  ctx.moveTo(-r * 0.82, r * 0.38);
  ctx.lineTo(-r * 0.40, r * 0.64);
  ctx.lineTo(0, r * 0.68);
  ctx.lineTo(r * 0.40, r * 0.64);
  ctx.lineTo(r * 0.82, r * 0.38);
  ctx.stroke();

  // --- E. Smirk Mouth Line ---
  ctx.beginPath();
  ctx.lineWidth = Math.max(1.8, r * 0.06);
  ctx.moveTo(-r * 0.26, r * 0.24);
  ctx.lineTo(-r * 0.10, r * 0.30);
  ctx.lineTo(0, r * 0.26);
  ctx.lineTo(r * 0.10, r * 0.30);
  ctx.lineTo(r * 0.26, r * 0.24);
  ctx.stroke();

  // --- F. Chin Markings (3 Upward Triangles) ---
  ctx.beginPath();
  // Center triangle
  ctx.moveTo(0, r * 0.72);
  ctx.lineTo(-r * 0.08, r * 0.94);
  ctx.lineTo(r * 0.08, r * 0.94);
  ctx.closePath();

  // Left triangle
  ctx.moveTo(-r * 0.16, r * 0.74);
  ctx.lineTo(-r * 0.26, r * 0.92);
  ctx.lineTo(-r * 0.10, r * 0.94);
  ctx.closePath();

  // Right triangle
  ctx.moveTo(r * 0.16, r * 0.74);
  ctx.lineTo(r * 0.10, r * 0.94);
  ctx.lineTo(r * 0.26, r * 0.92);
  ctx.closePath();

  ctx.fill();

  ctx.restore(); // Undo clip

  // Outer Border Outline
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#0a0a0d';
  ctx.stroke();

  // Status Overlays
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore();
}
