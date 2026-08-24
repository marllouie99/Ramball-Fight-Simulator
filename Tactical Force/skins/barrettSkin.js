// ─────────────────────────────────────────────
// TACTICAL FORCE — BARRETT M82 SKIN GRAPHICS
// Unified Tactical Operator: Heavy stealth combat helmet, comms headset, ballistic plate carrier, heavy .50 BMG steel mag pouches.
// ─────────────────────────────────────────────

export function drawBarrettSkin(ctx, fighter) {
  const r = (fighter && fighter.r) ? fighter.r : 25;
  const themeColor = (fighter && fighter.color) ? fighter.color : '#06b6d4';

  const hex = themeColor.replace('#', '');
  const tR = parseInt(hex.substring(0, 2), 16) || 6;
  const tG = parseInt(hex.substring(2, 4), 16) || 182;
  const tB = parseInt(hex.substring(4, 6), 16) || 212;
  const darkShade = `rgb(${Math.round(tR * 0.22)}, ${Math.round(tG * 0.22)}, ${Math.round(tB * 0.22)})`;
  const midShade = `rgb(${Math.round(tR * 0.45)}, ${Math.round(tG * 0.45)}, ${Math.round(tB * 0.45)})`;
  const lightShade = `rgba(${tR}, ${tG}, ${tB}, 0.85)`;

  ctx.save();

  // 1. Base Body Circle (Unified Dark Ops Uniform)
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 2. Heavy Armor Chest Plate Carrier (+Y Lower Half)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 1, r - 2, 0.18, Math.PI - 0.18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dual .50 BMG Heavy Steel Box Magazine Pouches
  for (let i = -1; i <= 0; i++) {
    const px = i * 12 + 1;
    const py = 5;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px, py, 9.5, 11);
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 0.9;
    ctx.strokeRect(px, py, 9.5, 11);

    // Heavy steel retention clasp
    ctx.fillStyle = midShade;
    ctx.fillRect(px + 2.5, py + 2, 4.5, 2);
  }

  // 3. Heavy Stealth Combat Helmet (-Y Upper Half)
  ctx.fillStyle = darkShade;
  ctx.strokeStyle = lightShade;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, -2, r * 0.93, Math.PI * 1.05, Math.PI * 1.95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Tactical Communication Headset & Ear Cups (Unified Standard)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(-r + 1, -7, 5, 10, 2);
  ctx.roundRect(r - 6, -7, 5, 10, 2);
  ctx.fill();
  ctx.stroke();

  // Headset headband
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -4, r * 0.82, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // 5. Unified Tactical Ballistic Goggles
  const goggleW = r * 1.08;
  const goggleH = 7.0;
  const goggleX = -goggleW / 2;
  const goggleY = -8.5;

  // Elastic goggle strap around helmet
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-r + 1, -5);
  ctx.lineTo(r - 1, -5);
  ctx.stroke();

  // Outer Goggle Frame
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(goggleX, goggleY, goggleW, goggleH, 3);
  ctx.fill();
  ctx.stroke();

  // Tinted Polycarbonate Lens (Glowing with theme color)
  ctx.fillStyle = lightShade;
  ctx.beginPath();
  ctx.roundRect(goggleX + 2, goggleY + 1.2, goggleW - 4, goggleH - 2.4, 2);
  ctx.fill();

  // Subtle Glint Highlight on Lens
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.beginPath();
  ctx.moveTo(goggleX + 4, goggleY + 2);
  ctx.lineTo(goggleX + goggleW * 0.35, goggleY + 2);
  ctx.lineTo(goggleX + goggleW * 0.28, goggleY + goggleH - 2.5);
  ctx.lineTo(goggleX + 4, goggleY + goggleH - 2.5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
