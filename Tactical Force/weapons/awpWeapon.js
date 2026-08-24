// ─────────────────────────────────────────────
// TACTICAL FORCE — AWP WEAPON GRAPHICS (AUTHENTIC ARCTIC WARFARE L96A1)
// Reference: Accuracy International Arctic Warfare Magnum (AWP / L96A1) with
// iconic thumbhole stock, rubber recoil pad, cheek riser, chassis screws,
// box magazine, fluted forend, bipod spigot, heavy bull barrel, bolt handle, and sniper scope
// ─────────────────────────────────────────────

export function drawAwpWeapon(ctx, x, y, gunAngle, r, options = {}) {
  const recoil = options.recoil || 0;
  const isFiring = options.isFiring || false;
  const isPreview = options.isPreview || false;
  const themeColor = options.themeColor || '#ef4444';

  // Derive darker and lighter variants from theme color
  const hex = themeColor.replace('#', '');
  const tR = parseInt(hex.substring(0, 2), 16) || 239;
  const tG = parseInt(hex.substring(2, 4), 16) || 68;
  const tB = parseInt(hex.substring(4, 6), 16) || 68;
  const darkShade = `rgb(${Math.round(tR * 0.20)}, ${Math.round(tG * 0.20)}, ${Math.round(tB * 0.20)})`;
  const midShade = `rgb(${Math.round(tR * 0.40)}, ${Math.round(tG * 0.40)}, ${Math.round(tB * 0.40)})`;
  const lightShade = `rgba(${tR}, ${tG}, ${tB}, 0.75)`;

  ctx.save();
  if (isPreview) {
    ctx.translate(x, y);
    ctx.rotate(gunAngle);
  }

  const isReloading = options.isReloading || false;
  const reloadProgress = options.reloadProgress || 0;
  const boltTimer = options.boltTimer || 0;
  const boltDuration = options.boltDuration || 26;

  let reloadTilt = 0;
  let reloadOffset = 0;
  let boltPullX = 0;
  let boltRot = 0;
  let magDropY = 0;
  let magAlpha = 1.0;

  if (isReloading) {
    const tiltSine = Math.sin(reloadProgress * Math.PI);
    reloadTilt = -tiltSine * 0.22;
    reloadOffset = -tiltSine * 5.0;
    ctx.rotate(reloadTilt);

    // 4-Phase Bolt Action & Mag Swap Animation
    if (reloadProgress < 0.25) {
      // 1. Lift & pull bolt rearward
      const p1 = reloadProgress / 0.25;
      boltRot = -0.65 * Math.min(1.0, p1 * 1.5);
      boltPullX = -10.0 * Math.min(1.0, Math.max(0, (p1 - 0.2) / 0.8));
    } else if (reloadProgress < 0.65) {
      // 2. Bolt held open during magazine drop & fresh mag insertion
      boltRot = -0.65;
      boltPullX = -10.0;
      if (reloadProgress < 0.45) {
        const dropP = (reloadProgress - 0.25) / 0.20;
        magDropY = dropP * 16.0;
        magAlpha = Math.max(0, 1.0 - dropP * 1.5);
      } else {
        const insertP = (reloadProgress - 0.45) / 0.20;
        magDropY = (1.0 - insertP) * 16.0;
        magAlpha = Math.min(1.0, insertP * 2.0);
      }
    } else if (reloadProgress < 0.88) {
      // 3. Slam bolt forward into battery & cam handle down into lock
      const p3 = (reloadProgress - 0.65) / 0.23;
      boltPullX = -10.0 * (1.0 - Math.min(1.0, p3 * 1.6));
      boltRot = -0.65 * (1.0 - Math.max(0, (p3 - 0.5) / 0.5));
    } else {
      boltRot = 0;
      boltPullX = 0;
    }
  } else if (boltTimer > 0) {
    // Dynamic Bolt Action Racking Cycle after firing (Like Shotgun pump)
    const bp = 1.0 - (boltTimer / boltDuration);
    if (bp < 0.45) {
      // 1. Lift & pull bolt rearward
      const p1 = bp / 0.45;
      boltRot = -0.65 * Math.sin(p1 * Math.PI * 0.5);
      boltPullX = -10.0 * Math.sin(p1 * Math.PI * 0.5);
    } else if (bp < 0.85) {
      // 2. Push bolt forward into battery
      const p2 = (bp - 0.45) / 0.40;
      boltPullX = -10.0 * (1.0 - p2);
      boltRot = -0.65;
    } else {
      // 3. Cam bolt handle down into lock
      const p3 = (bp - 0.85) / 0.15;
      boltPullX = 0;
      boltRot = -0.65 * (1.0 - p3);
    }
  }

  // Heavy .338 Lapua Recoil Pitch & Kickback
  const recoilX = -recoil * 14.0 + reloadOffset;
  const recoilPitch = -recoil * 0.12; // Muzzle rise
  ctx.rotate(recoilPitch);

  const sizeRatio = (r && r > 0) ? (r / 25) : 1.0;
  const defaultScale = 1.15 * sizeRatio * (options.scale || 1.0);
  ctx.scale(defaultScale, defaultScale);

  const originX = (r * 0.45 + recoilX) / defaultScale;
  const originY = 0;

  // ─────────────────────────────────────────────
  // 1. ICONIC ARCTIC WARFARE THUMBHOLE STOCK (-X)
  // ─────────────────────────────────────────────
  const stockRearX = originX - 30;

  // Stepped Black Rubber Recoil Buttpad (Very Rear)
  ctx.fillStyle = '#050811';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(stockRearX - 5, -5.5, 5, 18, 1.5);
  ctx.fill();
  ctx.stroke();

  // Rubber Grip Rib Lines on Buttpad
  ctx.strokeStyle = midShade;
  ctx.lineWidth = 0.8;
  for (let b = 0; b < 4; b++) {
    ctx.beginPath();
    ctx.moveTo(stockRearX - 4, -3 + b * 4);
    ctx.lineTo(stockRearX - 1, -3 + b * 4);
    ctx.stroke();
  }

  // Adjustable Black Cheek Riser Pad (Comb)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(stockRearX + 2, -8.5, 18, 4.0, 1.5);
  ctx.fill();
  ctx.stroke();

  // Cheek Riser Height Adjustment Posts
  ctx.fillStyle = themeColor;
  ctx.fillRect(stockRearX + 6, -5.0, 2, 2.5);
  ctx.fillRect(stockRearX + 14, -5.0, 2, 2.5);

  // Main Thumbhole Polymer Stock Body (Olive/Dark Tactical Polymer)
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(stockRearX, -4.5);     // Top comb rear
  ctx.lineTo(originX + 2, -4.5);    // Top receiver tang
  ctx.lineTo(originX + 2, 4);       // Grip front strap
  ctx.lineTo(originX - 4, 15);      // Grip bottom
  ctx.lineTo(originX - 11, 15);     // Grip heel
  ctx.lineTo(originX - 14, 11);     // Under thumbhole
  ctx.lineTo(stockRearX + 8, 11);   // Bottom rear monopod hook
  ctx.lineTo(stockRearX + 8, 14);   // Monopod notch
  ctx.lineTo(stockRearX, 12);       // Bottom buttpad junction
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ICONIC OVAL THUMBHOLE CUTOUT (Empty space passing through stock)
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(originX - 14, 3.5, 6.5, 5.0, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Tactical Chassis Assembly Hex Screws (Black inlays matching photo)
  ctx.fillStyle = '#050811';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 0.8;
  const chassisScrews = [
    { sx: stockRearX + 6, sy: 2 },
    { sx: stockRearX + 20, sy: 1 },
    { sx: originX - 5, sy: 11 },   // Grip lower screw
    { sx: originX + 16, sy: 1 },  // Forward chassis screw
    { sx: originX + 32, sy: 1 },  // Forend screw
  ];
  for (let s of chassisScrews) {
    ctx.beginPath();
    ctx.arc(s.sx, s.sy, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // ─────────────────────────────────────────────
  // 2. TRIGGER GUARD, TRIGGER, & BOX MAGAZINE
  // ─────────────────────────────────────────────

  // Trigger Guard
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(originX - 2, 4);
  ctx.quadraticCurveTo(originX + 2, 10, originX + 7, 4);
  ctx.stroke();

  // Curved Match Trigger
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(originX + 1.5, 4.5);
  ctx.quadraticCurveTo(originX + 3.5, 7, originX + 1, 8.5);
  ctx.stroke();

  // Detachable 5-Round Box Magazine (+Y)
  if (magAlpha > 0.05) {
    ctx.save();
    ctx.globalAlpha = magAlpha;
    ctx.fillStyle = '#090d16';
    ctx.strokeStyle = themeColor;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(originX + 7, 4.5 + magDropY, 11, 8.5, 1);
    ctx.fill();
    ctx.stroke();

    // Magazine Baseplate Rib
    ctx.fillStyle = midShade;
    ctx.fillRect(originX + 6.5, 12 + magDropY, 12, 1.8);
    ctx.restore();
  }

  // ─────────────────────────────────────────────
  // 3. EXTENDED FOREND CHASSIS & BIPOD SPIGOT
  // ─────────────────────────────────────────────
  const forendLen = 42;

  // Forend Stock Body (+X)
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(originX + 2, -4.5);
  ctx.lineTo(originX + forendLen, -4.5);
  ctx.lineTo(originX + forendLen, 3.5);
  ctx.lineTo(originX + 18, 3.5);
  ctx.lineTo(originX + 2, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Longitudinal Forend Grip Fluting Groove (Matching photo)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(originX + 20, -1.5, 18, 2.8, 1);
  ctx.fill();
  ctx.stroke();

  // Forward Bipod Spigot Mounting Stud (Under front of chassis)
  ctx.fillStyle = '#050811';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.rect(originX + forendLen - 6, 3.5, 3.5, 3.0);
  ctx.fill();
  ctx.stroke();

  // ─────────────────────────────────────────────
  // 4. HEAVY RECEIVER & BOLT-ACTION HANDLE
  // ─────────────────────────────────────────────
  const receiverLen = 24;

  // Cylindrical Steel Receiver (Top)
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.roundRect(originX + 2, -5.5, receiverLen, 5.5, 1);
  ctx.fill();
  ctx.stroke();

  // Bolt Handle Assembly (Top-Rear / -Y with Tactical Knob)
  ctx.save();
  ctx.translate(originX + 9 + boltPullX, -4.5);
  ctx.rotate(boltRot);
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.0;
  // Bolt Stem
  ctx.fillRect(0, -4.5, 2.5, 5.0);
  ctx.strokeRect(0, -4.5, 2.5, 5.0);
  // Large Round Tactical Bolt Knob
  ctx.fillStyle = themeColor;
  ctx.beginPath();
  ctx.arc(1.25, -5.5, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Top Picatinny Optics Rail Mounted Above Receiver
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.rect(originX + 4, -7.5, receiverLen - 3, 2.2);
  ctx.fill();
  ctx.stroke();

  // ─────────────────────────────────────────────
  // 5. HIGH-MAGNIFICATION SNIPER SCOPE (OPTICS)
  // ─────────────────────────────────────────────
  const scopeX = originX + 2;

  // Main 30mm Scope Tube
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(scopeX + 3, -12.5, 24, 4.5, 1);
  ctx.fill();
  ctx.stroke();

  // Front Objective Bell (Large 50mm Lens)
  ctx.beginPath();
  ctx.roundRect(scopeX + 22, -14.5, 7.5, 8.5, 1);
  ctx.fill();
  ctx.stroke();

  // Illuminated Multi-Coated Objective Lens (Front)
  ctx.fillStyle = lightShade;
  ctx.fillRect(scopeX + 28, -13.5, 1.5, 6.5);

  // Rear Ocular Eyepiece (With Rubber Eye Cup)
  ctx.beginPath();
  ctx.roundRect(scopeX, -13.5, 4.5, 6.5, 1);
  ctx.fill();
  ctx.stroke();

  // Scope Dual Heavy Mount Rings
  ctx.fillStyle = midShade;
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 0.8;
  ctx.fillRect(scopeX + 6, -8.0, 3.0, 2.8);
  ctx.strokeRect(scopeX + 6, -8.0, 3.0, 2.8);
  ctx.fillRect(scopeX + 18, -8.0, 3.0, 2.8);
  ctx.strokeRect(scopeX + 18, -8.0, 3.0, 2.8);

  // Elevation & Windage Tactical Adjustment Turrets
  ctx.fillStyle = themeColor;
  ctx.fillRect(scopeX + 13, -15.0, 4.0, 2.8); // Elevation
  ctx.fillRect(scopeX + 13, -10.5, 4.0, 1.2); // Windage

  // ─────────────────────────────────────────────
  // 6. FREE-FLOATING HEAVY BULL BARREL (+X)
  // ─────────────────────────────────────────────
  const barrelLen = 52;
  const barrelStartX = originX + forendLen;

  // Precision Steel Bull Barrel
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.roundRect(barrelStartX, -2.5, barrelLen, 4.5, 1);
  ctx.fill();
  ctx.stroke();

  // Longitudinal Barrel Fluting (Plasma Cooling Channel)
  ctx.fillStyle = lightShade;
  ctx.fillRect(barrelStartX + 4, -1.0, barrelLen - 12, 1.6);

  // Stepped Target Muzzle Crown / Thread Protector
  ctx.fillStyle = '#050811';
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(barrelStartX + barrelLen, -3.2, 5.0, 6.0, 1);
  ctx.fill();
  ctx.stroke();

  // ─────────────────────────────────────────────
  // 7. MUZZLE FLASH
  // ─────────────────────────────────────────────
  if (isFiring) {
    const tipX = barrelStartX + barrelLen + 6;
    drawTacticalSniperMuzzleFlash(ctx, tipX, -0.2, 1.7, themeColor);
  }

  ctx.restore();
}

function drawTacticalSniperMuzzleFlash(ctx, x, y, scale = 1.7, themeColor = '#ef4444') {
  ctx.save();
  ctx.translate(x, y);

  // White-hot plasma core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 4.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Forward supersonic blast cone
  ctx.fillStyle = '#fecaca';
  ctx.beginPath();
  ctx.moveTo(0, -6 * scale);
  ctx.lineTo(22 * scale, 0);
  ctx.lineTo(0, 6 * scale);
  ctx.closePath();
  ctx.fill();

  // Lateral high-pressure compensator jets
  ctx.fillStyle = themeColor;
  ctx.globalAlpha = 0.90;
  ctx.beginPath();
  ctx.moveTo(2 * scale, -11 * scale);
  ctx.lineTo(13 * scale, -3 * scale);
  ctx.lineTo(4 * scale, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(2 * scale, 11 * scale);
  ctx.lineTo(13 * scale, 3 * scale);
  ctx.lineTo(4 * scale, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export const drawTacticalSniperWeapon = drawAwpWeapon;
