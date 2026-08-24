// ─────────────────────────────────────────────
// TACTICAL FORCE — SPAS-12 WEAPON GRAPHICS (NEON EMERALD THEME)
// Complete High-Fidelity 12-Gauge Tactical Shotgun with Neon Contours (Non-Black Strokes)
// ─────────────────────────────────────────────

export function drawSpas12Weapon(ctx, x, y, gunAngle, r, options = {}) {
  const recoil = options.recoil || 0;
  const isFiring = options.isFiring || false;
  const isPreview = options.isPreview || false;
  const pumpTimer = options.pumpTimer || 0;
  const themeColor = options.themeColor || '#10b981';

  const hex = themeColor.replace('#', '');
  const tR = parseInt(hex.substring(0, 2), 16) || 16;
  const tG = parseInt(hex.substring(2, 4), 16) || 185;
  const tB = parseInt(hex.substring(4, 6), 16) || 129;
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
  let reloadPump = 0;

  if (isReloading) {
    const relP = reloadProgress;
    const tiltSine = Math.sin(relP * Math.PI);
    reloadTilt = -0.20 * tiltSine;
    reloadOffset = -3.0 * tiltSine;
    ctx.rotate(reloadTilt);

    if (relP > 0.65) {
      const rackP = (relP - 0.65) / 0.35;
      reloadPump = Math.sin(rackP * Math.PI) * 7.5;
    }
  }

  const recoilOffset = recoil * 11.0;
  const recoilPitch = (recoilOffset > 0) ? -0.12 * Math.min(1.0, recoilOffset / 11.0) : 0;
  ctx.rotate(recoilPitch);

  const sizeRatio = (r && r > 0) ? (r / 25) : 1.0;
  const defaultScale = 1.20 * sizeRatio * (options.scale || 1.0);
  ctx.scale(defaultScale, defaultScale);

  const barrelX = (r * 0.85 - recoilOffset + reloadOffset) / defaultScale;
  const barrelY = -3.0;
  const pumpDuration = options.pumpDuration || 22;
  const pumpProgress = pumpTimer > 0 ? (pumpTimer / pumpDuration) : 0;
  const activePumpOffset = (pumpTimer > 0 ? -Math.sin(pumpProgress * Math.PI) * 10.0 : 0) - reloadPump;

  // ─────────────────────────────────────────────────────────────
  // 1. SKELETONIZED COLLAPSIBLE STOCK & PISTOL GRIP
  // ─────────────────────────────────────────────────────────────
  // Twin Telescoping Steel Stock Guide Rods
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.rect(barrelX - 25, barrelY - 2.8, 14, 2.0); // Top rod
  ctx.rect(barrelX - 25, barrelY + 1.2, 14, 2.0); // Bottom rod
  ctx.fill();
  ctx.stroke();

  // Stock locking notches
  ctx.fillStyle = neonLight;
  ctx.fillRect(barrelX - 21, barrelY - 2.8, 1.2, 2.0);
  ctx.fillRect(barrelX - 17, barrelY - 2.8, 1.2, 2.0);

  // Skeletonized Polymer Buttstock Body
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(barrelX - 25, barrelY - 5.5);
  ctx.lineTo(barrelX - 29, barrelY - 5.5);
  ctx.lineTo(barrelX - 30, barrelY + 12.0);
  ctx.lineTo(barrelX - 25, barrelY + 8.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Stock cheek rest upper bevel
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(barrelX - 29, barrelY - 5.5, 4.0, 3.2);

  // Textured Rubber Recoil Buttpad
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(barrelX - 32.5, barrelY - 6.5, 3.0, 20.0, [1.5, 0, 0, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Buttpad horizontal neon recoil ridges
  ctx.strokeStyle = neonLight;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (let rIdx = 0; rIdx < 5; rIdx++) {
    const rY = barrelY - 4.0 + rIdx * 3.8;
    ctx.moveTo(barrelX - 32.0, rY);
    ctx.lineTo(barrelX - 30.0, rY);
  }
  ctx.stroke();

  // Rear sling swivel attachment loop
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(barrelX - 27.5, barrelY + 9.5, 1.8, 0, Math.PI * 2);
  ctx.stroke();

  // Ergonomic Pistol Grip
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(barrelX - 9.5, barrelY + 3.8);
  ctx.lineTo(barrelX - 18.5, barrelY + 17.8);
  ctx.lineTo(barrelX - 11.5, barrelY + 19.2);
  ctx.lineTo(barrelX - 2.8, barrelY + 6.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Pistol grip stipple texture panel
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.roundRect(barrelX - 15.0, barrelY + 7.5, 5.0, 9.0, 1.0);
  ctx.fill();

  ctx.strokeStyle = neonLight;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(barrelX - 14.5, barrelY + 9.5); ctx.lineTo(barrelX - 11.0, barrelY + 9.5);
  ctx.moveTo(barrelX - 15.0, barrelY + 12.0); ctx.lineTo(barrelX - 11.5, barrelY + 12.0);
  ctx.moveTo(barrelX - 15.5, barrelY + 14.5); ctx.lineTo(barrelX - 12.0, barrelY + 14.5);
  ctx.stroke();

  // ─────────────────────────────────────────────────────────────
  // 2. RECEIVER, TOP PICATINNY RAIL & BOLT MECHANISM
  // ─────────────────────────────────────────────────────────────
  // Receiver Main Body (Deep Cyber Slate with Neon Contours)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(barrelX - 12.5, barrelY - 5.5, 25.0, 11.5, [1.5, 1.0, 1.0, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Receiver Neon Conduit Chamfer Line
  ctx.strokeStyle = neonLight;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(barrelX - 11.5, barrelY - 3.8);
  ctx.lineTo(barrelX + 11.5, barrelY - 3.8);
  ctx.stroke();

  // Trigger group retaining pins
  ctx.fillStyle = neonStroke;
  ctx.beginPath();
  ctx.arc(barrelX - 4.5, barrelY + 3.8, 0.9, 0, Math.PI * 2);
  ctx.arc(barrelX + 3.5, barrelY + 3.8, 0.9, 0, Math.PI * 2);
  ctx.fill();

  // Top MIL-STD-1913 Picatinny Rail
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.rect(barrelX - 11.0, barrelY - 7.5, 22.0, 2.2);
  ctx.fill();
  ctx.stroke();

  // Rail cross-slots (individual rail teeth)
  for (let rIdx = 0; rIdx < 8; rIdx++) {
    ctx.fillStyle = neonLight;
    ctx.fillRect(barrelX - 9.5 + rIdx * 2.6, barrelY - 7.5, 1.2, 1.6);
  }

  // LPA Ghost Ring Rear Sight
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.rect(barrelX - 10.5, barrelY - 10.2, 4.2, 3.0);
  ctx.fill();
  ctx.stroke();

  // Ghost ring aperture circle & protective wings
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.arc(barrelX - 8.4, barrelY - 9.2, 1.2, 0, Math.PI * 2);
  ctx.stroke();

  // Open Ejection Port Chamber
  ctx.fillStyle = '#05070a';
  ctx.fillRect(barrelX - 4.5, barrelY - 3.2, 11.5, 5.5);

  // Steel Bolt Carrier (slides when racking)
  const isBoltRacked = (activePumpOffset < -2.5);
  const boltSlideX = isBoltRacked ? -6.0 : 0;

  ctx.save();
  ctx.translate(boltSlideX, 0);

  ctx.fillStyle = '#CBD5E1';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX - 1.0, barrelY - 2.8, 7.5, 4.6, 0.5);
  ctx.fill();
  ctx.stroke();

  // Extractor Claw
  ctx.fillStyle = neonStroke;
  ctx.fillRect(barrelX + 5.0, barrelY - 2.2, 1.5, 3.4);

  // Protruding Tactical Charging Handle Knob
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX + 1.2, barrelY - 1.2, 4.8, 2.2, 0.6);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // High-Brass 12-Gauge Hull visible when racking
  if (isBoltRacked) {
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(barrelX - 3.5, barrelY - 2.0, 4.5, 3.0);
    ctx.fillStyle = neonStroke;
    ctx.fillRect(barrelX + 1.0, barrelY - 2.0, 3.5, 3.0);
  }

  // ── Dynamic 12-Gauge Shell Loading Animation (John Wick Style) ──
  if (isReloading && reloadProgress < 0.72) {
    const shellP = (reloadProgress * 4.0) % 1.0;
    const shellSlideX = (1 - shellP) * 12.0;
    const shellSlideY = (1 - shellP) * 8.0;

    ctx.save();
    ctx.translate(barrelX - 2.0 + shellSlideX, barrelY + 7.0 + shellSlideY);
    ctx.rotate(0.20 * (1 - shellP));

    // High-brass base
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-5.0, -1.8, 3.0, 3.6);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-5.0, -1.8, 3.0, 3.6);

    // Emerald Polymer Hull
    ctx.fillStyle = neonStroke;
    ctx.beginPath();
    ctx.roundRect(-2.0, -1.8, 7.5, 3.6, [0, 0.8, 0.8, 0]);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // Oversized Tactical Bolt Release Button
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(barrelX - 1.5, barrelY + 2.8, 4.5, 1.8, 0.4);
  ctx.fill();
  ctx.stroke();

  // ─────────────────────────────────────────────────────────────
  // 3. EXTENDED 7+1 MAGAZINE TUBE & BARREL CLAMP
  // ─────────────────────────────────────────────────────────────
  // Extended Steel Magazine Tube
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(barrelX + 10.5, barrelY + 1.8, 33.5, 4.8, 0.8);
  ctx.fill();
  ctx.stroke();

  // Knurled Magazine Tube Cap
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.rect(barrelX + 43.0, barrelY + 1.6, 3.2, 5.2);
  ctx.fill();
  ctx.stroke();

  // Heavy-Duty Dual-Bolt Barrel & Mag Tube Clamp Bracket
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(barrelX + 38.5, barrelY - 5.0, 3.8, 12.0, 0.8);
  ctx.fill();
  ctx.stroke();

  // Clamp hex fastener screws
  ctx.fillStyle = neonLight;
  ctx.fillRect(barrelX + 39.6, barrelY - 3.2, 1.4, 1.4);
  ctx.fillRect(barrelX + 39.6, barrelY + 3.8, 1.4, 1.4);

  // ─────────────────────────────────────────────────────────────
  // 4. 18.5" HEAVY STEEL BARREL & VENTILATED HEAT SHIELD
  // ─────────────────────────────────────────────────────────────
  // Heavy Steel Barrel
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(barrelX + 11.5, barrelY - 5.0, 37.0, 6.4, 0.8);
  ctx.fill();
  ctx.stroke();

  // Tactical Breacher Choke / Muzzle Crown Ring
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(barrelX + 47.0, barrelY - 5.8, 3.5, 7.8, 0.6);
  ctx.fill();
  ctx.stroke();

  // Breacher Crown crenellated teeth at muzzle face
  for (let bIdx = 0; bIdx < 3; bIdx++) {
    ctx.fillStyle = neonStroke;
    ctx.fillRect(barrelX + 49.5, barrelY - 5.0 + bIdx * 2.6, 1.5, 1.4);
  }

  // Ventilated Heat Shield (Perforated Oval Heat Vents with Neon Contours)
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(barrelX + 13.0, barrelY - 7.0, 24.5, 2.5, 0.6);
  ctx.fill();
  ctx.stroke();

  // Stamped Oval Heat Dissipation Vent Slots with Neon Inlays
  for (let vIdx = 0; vIdx < 5; vIdx++) {
    ctx.fillStyle = neonLight;
    ctx.beginPath();
    ctx.roundRect(barrelX + 14.5 + vIdx * 4.4, barrelY - 6.6, 2.8, 1.6, 0.5);
    ctx.fill();
  }

  // High-Visibility Fiber Optic Front Sight
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.rect(barrelX + 44.0, barrelY - 8.2, 4.0, 3.2);
  ctx.fill();
  ctx.stroke();

  // Fiber Optic Neon Sight Tube
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(barrelX + 44.5, barrelY - 7.6, 3.0, 1.8);

  // ─────────────────────────────────────────────────────────────
  // 5. RIBBED PUMP FOREND (Animates dynamically with pump action)
  // ─────────────────────────────────────────────────────────────
  ctx.save();
  ctx.translate(activePumpOffset, 0);

  // Main Ribbed Pump Body
  ctx.fillStyle = '#0b0f19';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.roundRect(barrelX + 15.0, barrelY + 0.2, 22.0, 8.2, 1.2);
  ctx.fill();
  ctx.stroke();

  // Forend front hand-stop flange
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = neonStroke;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.roundRect(barrelX + 35.0, barrelY - 0.5, 2.5, 9.6, 0.6);
  ctx.fill();
  ctx.stroke();

  // Longitudinal Non-Slip Traction Ribs with Neon Inlays
  for (let rib = 0; rib < 6; rib++) {
    const rx = barrelX + 17.0 + rib * 2.8;
    ctx.strokeStyle = neonLight;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(rx, barrelY + 0.8);
    ctx.lineTo(rx, barrelY + 7.6);
    ctx.stroke();
  }

  ctx.restore();

  // ─────────────────────────────────────────────────────────────
  // 6. MUZZLE FLASH (Wide 6-Spike Blast with White-Hot Core)
  // ─────────────────────────────────────────────────────────────
  if (isFiring) {
    const flashMuzzleX = barrelX + 51.0;
    const flashMuzzleY = barrelY - 1.8;

    // Layer 1: Outer Neon Aura
    ctx.fillStyle = neonLight;
    ctx.beginPath();
    ctx.arc(flashMuzzleX + 6, flashMuzzleY, 14, 0, Math.PI * 2);
    ctx.fill();

    // Layer 2: Wide Multi-Spike Shotgun Blast
    ctx.fillStyle = neonStroke;
    ctx.beginPath();
    ctx.moveTo(flashMuzzleX, flashMuzzleY - 6);
    ctx.lineTo(flashMuzzleX + 18, flashMuzzleY - 12);
    ctx.lineTo(flashMuzzleX + 9, flashMuzzleY - 2);
    ctx.lineTo(flashMuzzleX + 28, flashMuzzleY);
    ctx.lineTo(flashMuzzleX + 9, flashMuzzleY + 2);
    ctx.lineTo(flashMuzzleX + 18, flashMuzzleY + 12);
    ctx.lineTo(flashMuzzleX, flashMuzzleY + 6);
    ctx.closePath();
    ctx.fill();

    // Layer 3: Brilliant White-Hot Kinetic Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(flashMuzzleX, flashMuzzleY - 3);
    ctx.lineTo(flashMuzzleX + 12, flashMuzzleY - 6);
    ctx.lineTo(flashMuzzleX + 6, flashMuzzleY);
    ctx.lineTo(flashMuzzleX + 16, flashMuzzleY);
    ctx.lineTo(flashMuzzleX + 6, flashMuzzleY);
    ctx.lineTo(flashMuzzleX + 12, flashMuzzleY + 6);
    ctx.lineTo(flashMuzzleX, flashMuzzleY + 3);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

export const drawTacticalShotgunWeapon = drawSpas12Weapon;
