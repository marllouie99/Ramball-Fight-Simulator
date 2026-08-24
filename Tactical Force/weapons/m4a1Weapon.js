// ─────────────────────────────────────────────
// TACTICAL FORCE — M4A1 WEAPON GRAPHICS (NEON CYBER THEME)
// Complete High-Fidelity M4A1 Carbine with Neon Contours (Non-Black Strokes)
// ─────────────────────────────────────────────

export function drawM4A1Weapon(ctx, x, y, gunAngle, r, options = {}) {
  const recoil = options.recoil || 0;
  const isFiring = options.isFiring || false;
  const isPreview = options.isPreview || false;
  const themeColor = options.themeColor || '#3b82f6';

  const hex = themeColor.replace('#', '');
  const tR = parseInt(hex.substring(0, 2), 16) || 59;
  const tG = parseInt(hex.substring(2, 4), 16) || 130;
  const tB = parseInt(hex.substring(4, 6), 16) || 246;
  const neonStroke = themeColor;
  const neonLight = `rgba(${tR}, ${tG}, ${tB}, 0.75)`;
  const neonFaint = `rgba(${tR}, ${tG}, ${tB}, 0.25)`;

  ctx.save();
  if (isPreview) {
    ctx.translate(x, y);
    ctx.rotate(gunAngle);
  }

  const isReloading = options.isReloading || false;
  const reloadProgress = options.reloadProgress || 0;

  let reloadTilt = 0;
  let reloadOffset = 0;
  let magSlideY = 0;
  let magSlideX = 0;
  let showMag = true;
  let chargingOffset = 0;

  if (isReloading) {
    const relP = reloadProgress;
    const tiltSine = Math.sin(relP * Math.PI);
    reloadTilt = -0.22 * tiltSine;
    reloadOffset = -3.5 * tiltSine;
    ctx.rotate(reloadTilt);

    // 4-Phase Reload: Pull -> Drop -> Insert -> Slap/Lock
    if (relP < 0.28) {
      const p1 = relP / 0.28;
      magSlideY = p1 * 24.0;
      magSlideX = -p1 * 3.0;
    } else if (relP < 0.55) {
      showMag = false;
    } else if (relP < 0.85) {
      const p3 = (relP - 0.55) / 0.30;
      magSlideY = (1.0 - p3) * 24.0;
      magSlideX = -(1.0 - p3) * 3.0;
    } else {
      magSlideY = 0;
      magSlideX = 0;
      const slapP = (relP - 0.85) / 0.15;
      chargingOffset = -Math.sin(slapP * Math.PI) * 6.0;
    }
  }

  const recoilOffset = recoil * 8.0;
  const recoilPitch = (recoilOffset > 0) ? -0.075 * Math.min(1.0, recoilOffset / 8.0) : 0;
  ctx.rotate(recoilPitch);

  const sizeRatio = (r && r > 0) ? (r / 25) : 1.0;
  const defaultScale = 1.15 * sizeRatio * (options.scale || 1.0);
  ctx.scale(defaultScale, defaultScale);

  const barrelX = (r * 0.85 - recoilOffset + reloadOffset) / defaultScale;
  const barrelY = -2.5;

  // ─────────────────────────────────────────────────────────────
  // 1. BUFFER TUBE & COLLAPSIBLE LE / CARBINE STOCK
  // ─────────────────────────────────────────────────────────────
  // Cylindrical Buffer Tube
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.rect(barrelX - 27, barrelY - 2.6, 17, 5.2);
  ctx.fill();
  ctx.stroke();

  // Buffer tube lower rail track
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = neonLight;
  ctx.lineWidth = 0.8;
  ctx.strokeRect(barrelX - 26, barrelY + 2.6, 15, 1.6);
  ctx.fillRect(barrelX - 26, barrelY + 2.6, 15, 1.6);

  // LE / M4 Carbine Stock Main Body
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(barrelX - 30, barrelY - 5.8, 17, 10.5, [1.5, 0, 0, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Stock Lower Angled Triangular Strut
  ctx.beginPath();
  ctx.moveTo(barrelX - 30, barrelY + 4.7);
  ctx.lineTo(barrelX - 30, barrelY + 12.5);
  ctx.lineTo(barrelX - 15, barrelY + 4.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Stock Adjustment Latch / Release Lever
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX - 23, barrelY + 2.8, 8, 3.2, 0.8);
  ctx.fill();
  ctx.stroke();

  // Textured Rubber Buttpad (Rear plate)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(barrelX - 32.5, barrelY - 6.8, 3.2, 20.2, [1.5, 0, 0, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Buttpad vertical neon traction ridges
  ctx.strokeStyle = neonLight;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(barrelX - 31, barrelY - 4); ctx.lineTo(barrelX - 31, barrelY + 11);
  ctx.stroke();

  // Sling swivel loop mount
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.8;
  ctx.strokeRect(barrelX - 28, barrelY + 12, 3.5, 2.5);

  // ─────────────────────────────────────────────────────────────
  // 2. A2 PISTOL GRIP & TRIGGER ASSEMBLY
  // ─────────────────────────────────────────────────────────────
  // A2 Ergonomic Pistol Grip
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(barrelX - 10, barrelY + 4.5);
  ctx.lineTo(barrelX - 17.5, barrelY + 18.5);
  ctx.lineTo(barrelX - 11.5, barrelY + 19.5);
  ctx.lineTo(barrelX - 4.5, barrelY + 5.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // A2 Finger Groove Notch Bump on front edge
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(barrelX - 15.5, barrelY + 10.5, 3.2, 3.5, 1.0);
  ctx.fill();

  // Grip checkering texture lines (neon accents)
  ctx.strokeStyle = neonLight;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(barrelX - 13, barrelY + 7);  ctx.lineTo(barrelX - 9, barrelY + 8);
  ctx.moveTo(barrelX - 15, barrelY + 14); ctx.lineTo(barrelX - 10, barrelY + 15);
  ctx.moveTo(barrelX - 16, barrelY + 17); ctx.lineTo(barrelX - 11, barrelY + 18);
  ctx.stroke();

  // Trigger Guard (Oval loop underneath receiver)
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(barrelX - 1.5, barrelY + 7.0, 3.2, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // Curved Metal Trigger inside guard
  ctx.strokeStyle = neonLight;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(barrelX - 2.0, barrelY + 5.5);
  ctx.quadraticCurveTo(barrelX - 3.2, barrelY + 7.8, barrelX - 2.0, barrelY + 9.2);
  ctx.stroke();

  // ─────────────────────────────────────────────────────────────
  // 3. CURVED 30-ROUND STANAG / PMAG MAGAZINE (4-Phase Reload)
  // ─────────────────────────────────────────────────────────────
  if (showMag) {
    ctx.save();
    ctx.translate(magSlideX, magSlideY);

    // Magazine Body (Authentic forward-curving STANAG 30-round curve)
    ctx.fillStyle = '#0b0f19';
    ctx.strokeStyle = neonStroke;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(barrelX + 1.0, barrelY + 5.5);
    ctx.bezierCurveTo(barrelX + 1.5, barrelY + 12.0, barrelX + 3.0, barrelY + 19.5, barrelX + 5.5, barrelY + 26.5);
    ctx.lineTo(barrelX + 14.5, barrelY + 25.0);
    ctx.bezierCurveTo(barrelX + 12.2, barrelY + 19.5, barrelX + 10.5, barrelY + 12.0, barrelX + 10.0, barrelY + 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Neon Stamped Vertical Reinforcement Ribs
    const ribOffsets = [0.22, 0.50, 0.78];
    for (let rIdx = 0; rIdx < ribOffsets.length; rIdx++) {
      const frac = ribOffsets[rIdx];
      const topX = (barrelX + 1.0) * (1 - frac) + (barrelX + 10.0) * frac;
      const midX = (barrelX + 2.2) * (1 - frac) + (barrelX + 11.2) * frac;
      const botX = (barrelX + 5.5) * (1 - frac) + (barrelX + 14.5) * frac;
      const botY = (barrelY + 26.5) * (1 - frac) + (barrelY + 25.0) * frac;

      ctx.strokeStyle = neonLight;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(topX, barrelY + 6.0);
      ctx.bezierCurveTo(topX + 0.3, barrelY + 12.0, midX + 0.5, barrelY + 19.5, botX + 0.4, botY - 1.2);
      ctx.stroke();
    }

    // Glowing Mag Level Window Inlay
    ctx.fillStyle = neonLight;
    ctx.fillRect(barrelX + 5.0, barrelY + 11.0, 3.0, 6.0);

    // Magazine Floorplate at bottom
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = neonStroke;
    ctx.lineWidth = 1.0;
    ctx.save();
    ctx.translate(barrelX + 10.0, barrelY + 25.8);
    ctx.rotate(-0.18);
    ctx.beginPath();
    ctx.roundRect(-5.2, -1.2, 10.2, 2.6, 0.6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  } else {
    // Empty magwell opening
    ctx.fillStyle = '#05070a';
    ctx.strokeStyle = neonStroke;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(barrelX + 1.5, barrelY + 5.5, 8.5, 3.2);
    ctx.fillRect(barrelX + 1.5, barrelY + 5.5, 8.5, 3.2);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. LOWER & UPPER RECEIVER
  // ─────────────────────────────────────────────────────────────
  // Lower & Upper Receiver Body (Matte Cyber Slate with Neon Contours)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(barrelX - 11, barrelY - 6.0, 23, 11.5, 1.2);
  ctx.fill();
  ctx.stroke();

  // Magwell flared collar
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(barrelX + 0.5, barrelY + 2.0, 11.0, 4.5, 0.6);
  ctx.fill();
  ctx.stroke();

  // Receiver Neon Energy Conduit Accent
  ctx.fillStyle = neonLight;
  ctx.fillRect(barrelX - 8, barrelY - 1.0, 14, 1.6);

  // Fire selector switch
  ctx.fillStyle = neonStroke;
  ctx.beginPath();
  ctx.arc(barrelX - 8.5, barrelY + 2.5, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Take-down pins
  ctx.fillStyle = '#090d16';
  ctx.strokeStyle = neonLight;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(barrelX - 9.5, barrelY - 3.5, 1.1, 0, Math.PI * 2);
  ctx.arc(barrelX + 9.5, barrelY + 2.5, 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Ejection Port & Dust Cover
  ctx.fillStyle = (chargingOffset < -1.5) ? '#05070a' : '#1e293b';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.rect(barrelX - 3.0, barrelY - 4.5, 8.5, 4.5);
  ctx.fill();
  ctx.stroke();

  // Visible chamber bolt / cartridge when charging
  if (chargingOffset < -1.5) {
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(barrelX - 2.5 + chargingOffset * 0.45, barrelY - 4.0, 3.8, 3.5);
    ctx.fillStyle = neonStroke;
    ctx.fillRect(barrelX + 0.8, barrelY - 3.0, 4.2, 1.8);
  }

  // Brass Deflector
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(barrelX - 4.5, barrelY - 4.2);
  ctx.lineTo(barrelX - 7.0, barrelY - 2.2);
  ctx.lineTo(barrelX - 4.5, barrelY - 0.5);
  ctx.closePath();
  ctx.fill();

  // Forward Assist plunger
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX - 12.5, barrelY - 3.0, 3.0, 2.5, 0.5);
  ctx.fill();
  ctx.stroke();

  // Ambidextrous Charging Handle
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX - 13.5 + chargingOffset, barrelY - 7.2, 4.5, 2.2, 0.6);
  ctx.fill();
  ctx.stroke();

  // ─────────────────────────────────────────────────────────────
  // 5. AIMPOINT / HOLOGRAPHIC COMPACT RED DOT SCOPE
  // ─────────────────────────────────────────────────────────────
  // Picatinny Receiver Rail
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX - 11.0, barrelY - 7.5, 23.0, 2.0, 0.4);
  ctx.fill();
  ctx.stroke();

  // Rail recoil teeth
  for (let s = 0; s < 5; s++) {
    ctx.fillStyle = neonLight;
    ctx.fillRect(barrelX - 9.0 + s * 4.2, barrelY - 7.5, 1.6, 2.0);
  }

  // Scope Cantilever Riser Mount
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(barrelX - 7.5, barrelY - 10.0, 16.5, 2.8, 0.6);
  ctx.fill();
  ctx.stroke();

  // Scope Riser Pedestal Neck
  ctx.beginPath();
  ctx.roundRect(barrelX - 6.0, barrelY - 12.8, 14.0, 3.2, 0.5);
  ctx.fill();
  ctx.stroke();

  // Main Optic Sight Tube Body
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(barrelX - 8.5, barrelY - 18.5, 17.5, 6.8, 0.8);
  ctx.fill();
  ctx.stroke();

  // Rear Ocular Eyepiece Housing
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(barrelX - 12.2, barrelY - 19.5, 4.2, 8.8, 0.8);
  ctx.fill();
  ctx.stroke();

  // Rear Lens Glass (Semi-transparent neon tint)
  ctx.fillStyle = neonLight;
  ctx.fillRect(barrelX - 12.6, barrelY - 18.0, 0.9, 5.8);

  // Front Objective Lens Housing
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(barrelX + 8.5, barrelY - 19.8, 6.0, 9.4, 0.8);
  ctx.fill();
  ctx.stroke();

  // Front Optical Lens Glint
  ctx.fillStyle = neonLight;
  ctx.fillRect(barrelX + 15.0, barrelY - 18.0, 1.0, 5.8);

  // Top Battery Compartment
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX - 1.5, barrelY - 22.8, 11.5, 4.6, 0.8);
  ctx.fill();
  ctx.stroke();

  // Rotary Battery Cap & Elevation Dial
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX + 9.5, barrelY - 23.2, 3.0, 5.4, 0.6);
  ctx.fill();
  ctx.stroke();

  // Red Dot / Cyan Reticle Center Dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(barrelX - 0.5, barrelY - 15.2, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // ─────────────────────────────────────────────────────────────
  // 6. DELTA RING & CYLINDRICAL RIBBED CARBINE HANDGUARD
  // ─────────────────────────────────────────────────────────────
  // Delta Ring Handguard Retention Collar
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(barrelX + 12.0, barrelY - 6.2, 3.5, 12.0, 0.8);
  ctx.fill();
  ctx.stroke();

  // Cylindrical Ribbed Polymer Handguard Body
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.roundRect(barrelX + 15.5, barrelY - 6.0, 23.5, 11.5, 1.4);
  ctx.fill();
  ctx.stroke();

  // Vertical Ribs & Heat Vent Channels with Neon Inlays
  const ribCount = 7;
  for (let rIdx = 0; rIdx < ribCount; rIdx++) {
    const rx = barrelX + 18.0 + rIdx * 3.0;
    ctx.strokeStyle = neonLight;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(rx, barrelY - 5.0);
    ctx.lineTo(rx, barrelY + 4.5);
    ctx.stroke();
  }

  // Handguard Front Retention Endcap
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(barrelX + 39.0, barrelY - 5.0, 2.0, 9.5, 0.5);
  ctx.fill();
  ctx.stroke();

  // ─────────────────────────────────────────────────────────────
  // 7. A-FRAME TRIANGULAR FRONT SIGHT GAS BLOCK
  // ─────────────────────────────────────────────────────────────
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(barrelX + 41.0, barrelY - 3.5);
  ctx.lineTo(barrelX + 43.5, barrelY - 17.0);
  ctx.lineTo(barrelX + 45.0, barrelY - 17.0);
  ctx.lineTo(barrelX + 47.5, barrelY - 3.5);
  ctx.lineTo(barrelX + 48.5, barrelY + 4.5);
  ctx.lineTo(barrelX + 40.5, barrelY + 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Front Sight Post Tip (Neon Accent)
  ctx.fillStyle = neonStroke;
  ctx.fillRect(barrelX + 44.0, barrelY - 18.0, 1.0, 2.5);

  // Bayonet Lug bracket
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.8;
  ctx.strokeRect(barrelX + 43.0, barrelY + 4.5, 3.5, 2.2);

  // ─────────────────────────────────────────────────────────────
  // 8. STEPPED 14.5" STEEL BARREL & A2 BIRDCAGE FLASH HIDER
  // ─────────────────────────────────────────────────────────────
  // Stepped Steel Barrel
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.rect(barrelX + 47.5, barrelY - 2.0, 8.5, 3.8);
  ctx.fill();
  ctx.stroke();

  // M203 Step-Down Cutout
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(barrelX + 51.5, barrelY - 1.4, 2.6, 2.6);

  // Barrel Muzzle Thread Collar
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(barrelX + 56.0, barrelY - 2.0, 2.0, 3.8);

  // A2 Birdcage Flash Hider
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(barrelX + 58.0, barrelY - 3.0, 8.5, 5.8, 0.8);
  ctx.fill();
  ctx.stroke();

  // Longitudinal gas vent slots
  ctx.fillStyle = neonLight;
  ctx.fillRect(barrelX + 59.8, barrelY - 2.0, 1.4, 3.8);
  ctx.fillRect(barrelX + 62.2, barrelY - 2.0, 1.4, 3.8);
  ctx.fillRect(barrelX + 64.6, barrelY - 2.0, 1.4, 3.8);

  // ─────────────────────────────────────────────────────────────
  // 9. MUZZLE FLASH (Directional Multi-Spike Flash with White-Hot Core)
  // ─────────────────────────────────────────────────────────────
  if (isFiring) {
    const flashMuzzleX = barrelX + 66.5;
    const flashMuzzleY = barrelY - 0.1;

    // Layer 1: Outer Neon Aura
    ctx.fillStyle = neonLight;
    ctx.beginPath();
    ctx.arc(flashMuzzleX + 6, flashMuzzleY, 11, 0, Math.PI * 2);
    ctx.fill();

    // Layer 2: Main Outer Spikes
    ctx.fillStyle = neonStroke;
    ctx.beginPath();
    ctx.moveTo(flashMuzzleX, flashMuzzleY - 4);
    ctx.lineTo(flashMuzzleX + 16, flashMuzzleY - 8);
    ctx.lineTo(flashMuzzleX + 8, flashMuzzleY - 1);
    ctx.lineTo(flashMuzzleX + 24, flashMuzzleY);
    ctx.lineTo(flashMuzzleX + 8, flashMuzzleY + 1);
    ctx.lineTo(flashMuzzleX + 16, flashMuzzleY + 8);
    ctx.lineTo(flashMuzzleX, flashMuzzleY + 4);
    ctx.closePath();
    ctx.fill();

    // Layer 3: Brilliant White-Hot Kinetic Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(flashMuzzleX, flashMuzzleY - 2);
    ctx.lineTo(flashMuzzleX + 10, flashMuzzleY - 4);
    ctx.lineTo(flashMuzzleX + 5, flashMuzzleY);
    ctx.lineTo(flashMuzzleX + 14, flashMuzzleY);
    ctx.lineTo(flashMuzzleX + 5, flashMuzzleY);
    ctx.lineTo(flashMuzzleX + 10, flashMuzzleY + 4);
    ctx.lineTo(flashMuzzleX, flashMuzzleY + 2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export const drawTacticalRifleWeapon = drawM4A1Weapon;
