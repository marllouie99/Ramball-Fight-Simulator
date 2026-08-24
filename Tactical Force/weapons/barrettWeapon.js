// ─────────────────────────────────────────────
// TACTICAL FORCE — BARRETT M82A1 / M107 .50 BMG WEAPON GRAPHICS
// Authentic Heavy Anti-Materiel Sniper Rifle (Photo-Accurate):
// 1. Double-chamber arrowhead tank muzzle brake with 45° lateral gas ports
// 2. Long fluted match steel barrel
// 3. Perforated heat shroud with dual-row oblong cooling vents & lanyard wire
// 4. Stamped steel folding bipod with weight-relief holes & ski foot pads
// 5. Under-barrel folding carry handle with contoured grip
// 6. Elevated full-length Picatinny rail with cantilever dual-ring mount
// 7. High-magnification Leupold Mark 4 tactical optic with open flip-up cap & target turrets
// 8. Stamped steel 10-round .50 BMG angled box magazine with 3 vertical reinforcing ribs
// 9. Skeletonized triangular buttstock with upper recoil buffer tube & rubber buttpad
// 10. Synchronized two-handed tactical combat grip & smooth reload kinematics
// ─────────────────────────────────────────────

export function drawBarrettWeapon(ctx, x, y, gunAngle, r, options = {}) {
  const recoil = options.recoil || 0;
  const isFiring = options.isFiring || false;
  const isPreview = options.isPreview || false;
  const themeColor = options.themeColor || '#06b6d4';

  ctx.save();
  if (isPreview) {
    ctx.translate(x, y);
    ctx.rotate(gunAngle);
  }

  const isReloading = options.isReloading || false;
  const reloadProgress = options.reloadProgress || 0;
  const boltTimer = options.boltTimer || 0;
  const boltDuration = options.boltDuration || 28;

  let reloadTilt = 0;
  let reloadOffset = 0;
  let activeBoltRack = 0;

  if (isReloading) {
    const tiltSine = Math.sin(reloadProgress * Math.PI);
    reloadTilt = -tiltSine * 0.22; // Workspace high-ready cant
    reloadOffset = -tiltSine * 5.0;
    ctx.rotate(reloadTilt);

    if (reloadProgress >= 0.65 && reloadProgress < 0.82) {
      const p3 = (reloadProgress - 0.65) / 0.17;
      activeBoltRack = -Math.sin(p3 * Math.PI) * 11.0;
    }
  } else if (boltTimer > 0) {
    // Dynamic Reciprocating Bolt Racking & Crack Animation (Shotgun equivalent)
    const bp = 1.0 - (boltTimer / boltDuration);
    activeBoltRack = -Math.sin(bp * Math.PI) * 11.0;
  }

  // Heavy .50 BMG short-recoil reciprocating action
  const recoilX = -recoil * 8.0 + reloadOffset;
  const recoilRot = -recoil * 0.12;
  ctx.rotate(recoilRot);

  const sizeRatio = (r && r > 0) ? (r / 25) : 1.0;
  const barrettScale = 0.80;
  const totalScale = barrettScale * sizeRatio * (options.scale || 1.0);
  ctx.scale(totalScale, totalScale);

  const originX = (r * 0.52 + recoilX) / totalScale;
  const originY = 0;

  // ─────────────────────────────────────────────
  // 1. SKELETONIZED BUTTSTOCK & UPPER BUFFER TUBE
  // ─────────────────────────────────────────────
  // A. Upper Recoil Buffer Housing Tube
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.rect(originX - 44, -7.5, 34, 5.0);
  ctx.fill();
  ctx.stroke();

  // Cheek Rest Comb
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(originX - 38, -8.5, 24, 2.0);

  // B. Thick Textured Rubber Recoil Buttpad
  ctx.fillStyle = '#111827';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(originX - 48, -9.5, 4.5, 23.0, 1.5);
  ctx.fill();
  ctx.stroke();

  // Rubber tread grooving
  ctx.fillStyle = '#1f2937';
  for (let gy = -7.5; gy <= 10.5; gy += 3.5) {
    ctx.fillRect(originX - 47.5, gy, 2.0, 1.2);
  }

  // C. Stamped Steel Skeletonized Stock Strut (Hollow Triangular Loop)
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(originX - 44, -2.5);
  ctx.lineTo(originX - 44, 13.0);
  ctx.lineTo(originX - 16, 13.0);
  ctx.lineTo(originX - 10, 4.0);
  ctx.lineTo(originX - 10, -2.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner Skeleton Window Cutout
  ctx.fillStyle = '#05070c';
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.40)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(originX - 40, 0.5);
  ctx.lineTo(originX - 40, 10.0);
  ctx.lineTo(originX - 18, 10.0);
  ctx.lineTo(originX - 14, 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ─────────────────────────────────────────────
  // 2. LOWER RECEIVER, PISTOL GRIP & FIRE CONTROL
  // ─────────────────────────────────────────────
  // Lower Receiver Body
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(originX - 10, -2.5);
  ctx.lineTo(originX - 10, 5.0);
  ctx.lineTo(originX + 34, 5.0);
  ctx.lineTo(originX + 34, -2.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Receiver Cross-Pins & Takedown Hardware
  ctx.fillStyle = themeColor;
  ctx.beginPath();
  ctx.arc(originX - 6, 1.0, 1.3, 0, Math.PI * 2);
  ctx.arc(originX + 28, 1.0, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Ergonomic Grooved Pistol Grip (A2 Style with Finger Rest)
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(originX - 5, 5.0);
  ctx.lineTo(originX - 7, 18.0);
  ctx.lineTo(originX + 1, 18.5);
  ctx.lineTo(originX + 3, 14.0); // Finger rest bump
  ctx.lineTo(originX + 1, 11.5);
  ctx.lineTo(originX + 3, 5.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Grip Checkering / Stippling Texture
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
  ctx.lineWidth = 0.8;
  for (let gy = 7.0; gy <= 16.0; gy += 2.5) {
    ctx.beginPath();
    ctx.moveTo(originX - 4, gy);
    ctx.lineTo(originX + 1, gy);
    ctx.stroke();
  }

  // Steel Trigger Guard & Curved Match Trigger
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(originX + 3, 5.5);
  ctx.lineTo(originX + 5, 11.0);
  ctx.lineTo(originX + 13, 11.0);
  ctx.lineTo(originX + 13, 5.5);
  ctx.stroke();

  // Trigger Lever
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(originX + 9, 6.0);
  ctx.lineTo(originX + 7.5, 9.5);
  ctx.stroke();

  // ─────────────────────────────────────────────
  // 3. STAMPED STEEL 10-ROUND .50 BMG BOX MAGAZINE
  // ─────────────────────────────────────────────
  let magDropY = 0;
  if (isReloading) {
    if (reloadProgress < 0.28) {
      // Empty steel box dropping free
      const dropP = reloadProgress / 0.28;
      magDropY = dropP * 28;
    } else if (reloadProgress < 0.65) {
      // Fresh 10-round .50 BMG mag feeding upward into well
      const insertP = (reloadProgress - 0.28) / 0.37;
      magDropY = (1.0 - insertP) * 26;
    }
  }

  ctx.save();
  ctx.translate(0, magDropY);

  // Angled Magwell & Magazine Body
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(originX + 14, 5.0);
  ctx.lineTo(originX + 16, 27.0);
  ctx.lineTo(originX + 31, 26.0);
  ctx.lineTo(originX + 30, 5.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Stamped Vertical Reinforcing Ribs (3 distinct ribs)
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.60)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(originX + 19, 8.0);  ctx.lineTo(originX + 20.5, 23.5);
  ctx.moveTo(originX + 23, 8.0);  ctx.lineTo(originX + 24.5, 23.5);
  ctx.moveTo(originX + 27, 8.0);  ctx.lineTo(originX + 28.5, 23.5);
  ctx.stroke();

  // Bottom Steel Baseplate & Retention Latch
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(originX + 15, 26.5, 16.5, 2.2);

  ctx.restore();

  // ─────────────────────────────────────────────
  // 4. UPPER RECEIVER & BOLT CARRIER GROUP
  // ─────────────────────────────────────────────
  // Upper Receiver Frame
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.rect(originX - 10, -8.0, 44, 5.5);
  ctx.fill();
  ctx.stroke();

  // Massive .50 BMG Ejection Port & Steel Bolt Carrier
  ctx.fillStyle = '#020617';
  ctx.fillRect(originX + 4, -7.0, 22, 4.0);

  // Hardened Chrome Bolt Face (Moves with reciprocating bolt rack)
  ctx.fillStyle = isFiring ? '#fde047' : '#475569';
  ctx.fillRect(originX + 8 + activeBoltRack, -6.2, 12, 2.5);

  // Reciprocating Charging Handle Knob (Moves with bolt cycle)
  ctx.fillStyle = '#64748b';
  ctx.fillRect(originX + 18 + activeBoltRack, -8.5, 3.5, 2.0);

  // ─────────────────────────────────────────────
  // 5. PERFORATED HEAT SHROUD (DUAL-ROW OVAL VENTS)
  // ─────────────────────────────────────────────
  // Shroud Outer Body
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.rect(originX + 34, -7.5, 46, 12.0);
  ctx.fill();
  ctx.stroke();

  // Dual Row Oblong Cooling Vents (Matching Reference Photo)
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
  ctx.lineWidth = 0.6;

  // Top Row Oblong Vents
  for (let vx = originX + 38; vx <= originX + 74; vx += 5.5) {
    ctx.beginPath();
    ctx.roundRect(vx, -6.0, 3.8, 2.2, 1.0);
    ctx.fill();
    ctx.stroke();
  }

  // Bottom Row Oblong Vents
  for (let vx = originX + 38; vx <= originX + 74; vx += 5.5) {
    ctx.beginPath();
    ctx.roundRect(vx, -1.5, 3.8, 2.2, 1.0);
    ctx.fill();
    ctx.stroke();
  }

  // Shroud Wire Lanyard / Quick Release Pin
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(originX + 46, 4.5);
  ctx.quadraticCurveTo(originX + 54, 7.5, originX + 62, 4.5);
  ctx.stroke();

  // ─────────────────────────────────────────────
  // 6. UNDER-BARREL FOLDING CARRY HANDLE
  // ─────────────────────────────────────────────
  // Carry Handle Steel Bracket & Pivoting Arm
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(originX + 38, 4.5);
  ctx.lineTo(originX + 38, 12.0);
  ctx.lineTo(originX + 52, 12.0);
  ctx.lineTo(originX + 52, 4.5);
  ctx.stroke();

  // Contoured Rubber Carry Grip
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(originX + 39, 10.5, 12, 3.5, 1.5);
  ctx.fill();
  ctx.stroke();

  // ─────────────────────────────────────────────
  // 7. HEAVY COMBAT BIPOD WITH SKI SHOES
  // ─────────────────────────────────────────────
  const bipodMountX = originX + 70;
  // Bipod Pivot Joint Yoke
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(bipodMountX, 4.5, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Folded Tubular Leg Struts with Lightening Holes
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.rect(bipodMountX - 2, 6.0, 4.5, 20.0);
  ctx.fill();
  ctx.stroke();

  // Weight Reduction Holes down the Bipod Leg
  ctx.fillStyle = '#000000';
  for (let hy = 9.0; hy <= 23.0; hy += 3.5) {
    ctx.beginPath();
    ctx.arc(bipodMountX + 0.25, hy, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Flat Steel Ski / Shoe Foot Pad
  ctx.fillStyle = '#334155';
  ctx.fillRect(bipodMountX - 5, 25.5, 10.5, 2.0);

  // ─────────────────────────────────────────────
  // 8. LONG FLUTED MATCH STEEL BARREL
  // ─────────────────────────────────────────────
  const barrelStartX = originX + 80;
  const barrelLen = 52;
  const barrelEndX = barrelStartX + barrelLen;

  // Main Barrel Tube
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.rect(barrelStartX, -5.2, barrelLen, 4.5);
  ctx.fill();
  ctx.stroke();

  // Deep Longitudinal Fluting Grooves (High Cooling Surface Area)
  ctx.fillStyle = '#0b0f19';
  ctx.fillRect(barrelStartX + 3, -4.6, barrelLen - 6, 1.2);
  ctx.fillRect(barrelStartX + 3, -2.6, barrelLen - 6, 1.2);

  // ─────────────────────────────────────────────
  // 9. DUAL-CHAMBER ARROWHEAD TANK MUZZLE BRAKE
  // ─────────────────────────────────────────────
  const brakeX = barrelEndX;
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.3;

  // Distinctive Arrowhead / Chevron Contour
  ctx.beginPath();
  ctx.moveTo(brakeX, -8.0);
  ctx.lineTo(brakeX + 17, -5.5);
  ctx.lineTo(brakeX + 17, 2.5);
  ctx.lineTo(brakeX, 5.0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Dual Rectangular Lateral Gas Exhaust Ports
  ctx.fillStyle = '#000000';
  ctx.strokeStyle = 'rgba(6, 182, 212, 0.50)';
  ctx.lineWidth = 0.7;

  // Port 1 (Rearward 45° angle)
  ctx.beginPath();
  ctx.rect(brakeX + 3.5, -6.2, 3.8, 9.4);
  ctx.fill();
  ctx.stroke();

  // Port 2 (Front Chamber)
  ctx.beginPath();
  ctx.rect(brakeX + 9.5, -5.4, 3.8, 8.0);
  ctx.fill();
  ctx.stroke();

  // Crown Chamfer Bore Opening
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(brakeX + 16.5, -3.2, 1.5, 3.4);

  // ─────────────────────────────────────────────
  // 10. LEUPOLD MARK 4 SNIPER OPTIC & CANTILEVER MOUNT
  // ─────────────────────────────────────────────
  const scopeMountX = originX - 4;
  const scopeY = -15.5;

  // Elevated Picatinny Top Rail with Undercut Slots
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.rect(scopeMountX - 14, -9.5, 52, 2.0);
  ctx.fill();
  ctx.stroke();

  // Undercut rail slots
  ctx.fillStyle = '#0b0f19';
  for (let rx = scopeMountX - 12; rx <= scopeMountX + 34; rx += 4.5) {
    ctx.fillRect(rx, -9.5, 2.0, 1.8);
  }

  // Dual Cantilever Scope Rings (6-Bolt Heavy Rings)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.rect(scopeMountX - 4, -13.0, 4.5, 4.0);
  ctx.rect(scopeMountX + 22, -13.0, 4.5, 4.0);
  ctx.fill();
  ctx.stroke();

  // 34mm Main Optical Tube Body
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(scopeMountX - 12, scopeY + 1.2); // Ocular Eyepiece
  ctx.lineTo(scopeMountX - 5, scopeY + 2.2);
  ctx.lineTo(scopeMountX + 18, scopeY + 2.2);
  ctx.lineTo(scopeMountX + 28, scopeY - 0.5); // Objective Bell Flare
  ctx.lineTo(scopeMountX + 28, scopeY + 6.5);
  ctx.lineTo(scopeMountX + 18, scopeY + 3.8);
  ctx.lineTo(scopeMountX - 5, scopeY + 3.8);
  ctx.lineTo(scopeMountX - 12, scopeY + 4.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Open Flip-Up Protective Lens Cap on Ocular Bell
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(scopeMountX - 12, scopeY + 1.0);
  ctx.lineTo(scopeMountX - 16, scopeY - 3.5);
  ctx.stroke();

  // Elevation & Windage Knurled Target Turrets
  ctx.fillStyle = themeColor;
  ctx.fillRect(scopeMountX + 6, scopeY + 0.2, 4.5, 2.2); // Top Elevation Turret
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(scopeMountX + 6.5, scopeY + 2.4, 3.5, 1.2); // Side Windage Dial

  // Coated Objective Glass Lens (Cyan Reflection Glint)
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(scopeMountX + 27.2, scopeY + 0.5, 1.5, 5.0);

  // ─────────────────────────────────────────────
  // 11. MUZZLE BLAST & LATERAL EXHAUST
  // ─────────────────────────────────────────────
  if (isFiring) {
    drawBarrettMuzzleFlash(ctx, brakeX + 18, -1.5, 1.45, themeColor);
  }

  // ─────────────────────────────────────────────
  // 12. TACTICAL COMBAT HANDS (Rule 20)
  // ─────────────────────────────────────────────
  if (options.showHands && !options.hideFrontHand) {
    const handRadius = 7.5;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 1.8;

    // A. Master Trigger Hand (Gripping pistol grip)
    const trigX = originX - 1;
    const trigY = 12.0;
    ctx.beginPath();
    ctx.arc(trigX, trigY, handRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // B. Support Hand (Underneath handguard / magazine well)
    let suppX = originX + 50;
    let suppY = 0.5;

    if (isReloading) {
      if (reloadProgress < 0.28) {
        // Dropping spent .50 BMG box
        const p1 = reloadProgress / 0.28;
        suppX = originX + 24 - p1 * 6;
        suppY = 12 + p1 * 18;
      } else if (reloadProgress < 0.65) {
        // Slamming fresh steel box up into magwell
        const p2 = (reloadProgress - 0.28) / 0.37;
        suppX = originX + 18 + p2 * 5;
        suppY = 28 - p2 * 20;
      } else if (reloadProgress < 0.82) {
        // Racking large charging handle knob
        suppX = originX + 18;
        suppY = -8;
      } else {
        // Snapping back onto handguard carry balance
        const p4 = (reloadProgress - 0.82) / 0.18;
        suppX = originX + 18 + p4 * 32;
        suppY = -8 + p4 * 8.5;
      }
    } else if (boltTimer > 0) {
      // Dynamic bolt rack & mechanical crack after firing (Shotgun equivalent)
      const bp = 1.0 - (boltTimer / boltDuration);
      const reach = Math.sin(bp * Math.PI);
      suppX = originX + 50 - reach * 32;
      suppY = 0.5 - reach * 8.5;
    }

    ctx.beginPath();
    ctx.arc(suppX, suppY, handRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/** Massive high-caliber .50 BMG muzzle blast cone with dual lateral 45° side exhaust plumes */
function drawBarrettMuzzleFlash(ctx, x, y, scale = 1.45, themeColor = '#06b6d4') {
  ctx.save();
  ctx.translate(x, y);

  // White-hot supersonic core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 5.0 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Forward blast spike
  ctx.fillStyle = '#cffafe';
  ctx.beginPath();
  ctx.moveTo(0, -6.5 * scale);
  ctx.lineTo(28 * scale, 0);
  ctx.lineTo(0, 6.5 * scale);
  ctx.closePath();
  ctx.fill();

  // Dual lateral 45° side exhaust plumes from arrowhead brake ports
  ctx.fillStyle = themeColor;
  ctx.globalAlpha = 0.85;

  ctx.beginPath();
  ctx.moveTo(-6 * scale, -13 * scale);
  ctx.lineTo(10 * scale, -3 * scale);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-6 * scale, 13 * scale);
  ctx.lineTo(10 * scale, 3 * scale);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
