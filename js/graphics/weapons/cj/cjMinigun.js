// ─────────────────────────────────────────────
// CJ M134 Rotary Minigun Graphics
// ─────────────────────────────────────────────

import { getHandSize } from '../../../core/config.js';
import { state } from '../../../core/state.js';
import { isDarkMode } from './cjShared.js';

export function drawCjPixelMinigun(ctx, x = 0, y = 0, gunAngle = 0, r = 25, opts = {}) {
  ctx.save();
  let posX = x;
  let posY = y;
  let angle = 0;
  let scale = 1.0;

  if (typeof gunAngle === 'object') {
    opts = gunAngle;
    scale = opts.scale || 1.0;
  } else if (typeof gunAngle === 'number') {
    angle = gunAngle;
    if (typeof r === 'number') {
      posX = x + (r * 0.75);
      posY = y;
      scale = (opts && opts.scale) ? opts.scale : 1.10;
    } else if (typeof r === 'object') {
      opts = r;
      scale = opts.scale || 1.0;
    }
  }

  const recoil = (opts && opts.recoil) ? opts.recoil : 0;
  const flashTimer = (opts && opts.flashTimer) ? opts.flashTimer : 0;
  const heat = (opts && opts.heat) ? Math.min(1.0, Math.max(0, opts.heat)) : 0;
  const spinAngle = (opts && opts.spinAngle !== undefined) ? opts.spinAngle : (flashTimer > 0 ? (Date.now() * 0.02) : 0);

  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  const recoilOff = snap(recoil * 1.1);
  ctx.translate(snap(posX - recoilOff), snap(posY));
  if (angle !== 0) ctx.rotate(angle);
  ctx.scale(scale, scale);

  // ── LAYER 0: UNDERSLUNG DRIVE MOTOR POD & HEAVY AMMO FEED CHUTE ──
  const motorX = -8;
  const motorY = 4;
  const motorW = 22;
  const motorH = 10;

  // Flexible Canvas Ammo Feed Chute (Curved down-left)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-32, 4, 26, 12);
  ctx.fillRect(-28, 14, 18, 6);

  // Canvas Outer Belt
  ctx.fillStyle = '#1E2515'; // Dark military canvas green
  ctx.fillRect(-30, 6, 22, 8);
  ctx.fillRect(-26, 14, 14, 4);

  // Articulated Metallic Steel Link Clips & 7.62mm Brass Rounds
  const chuteRounds = [
    { x: -28, y: 6 },
    { x: -22, y: 8 },
    { x: -16, y: 10 },
    { x: -10, y: 12 }
  ];
  for (let c = 0; c < chuteRounds.length; c++) {
    const cr = chuteRounds[c];
    // Brass cartridge
    ctx.fillStyle = '#D97706';
    ctx.fillRect(cr.x, cr.y, 4, 6);
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(cr.x + 1, cr.y + 1, 2, 4);
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(cr.x + 1, cr.y + 1, 1, 2);
    // Steel link clip
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(cr.x + 3, cr.y - 1, 2, 8);
    ctx.fillStyle = '#475569';
    ctx.fillRect(cr.x + 3, cr.y, 1, 6);
  }

  // Cylindrical Motor Pod Body (Matte Military Olive-Drab)
  ctx.fillStyle = '#0B0D12'; // Dark outline
  ctx.fillRect(motorX - 1, motorY - 1, motorW + 2, motorH + 2);

  ctx.fillStyle = '#2C361C'; // Matte olive drab body
  ctx.fillRect(motorX, motorY, motorW, motorH);

  // Motor top specular highlight
  ctx.fillStyle = '#4A5A2F';
  ctx.fillRect(motorX + 2, motorY, motorW - 4, 2);
  ctx.fillStyle = '#5C703A';
  ctx.fillRect(motorX + 4, motorY, motorW - 8, 1);

  // Motor underside deep shadow
  ctx.fillStyle = '#161D0E';
  ctx.fillRect(motorX, motorY + motorH - 2, motorW, 2);

  // Stator Cooling Vents & Internal Coils
  ctx.fillStyle = '#11160C';
  ctx.fillRect(motorX + 4, motorY + 2, motorW - 8, motorH - 4);
  for (let vx = motorX + 5; vx < motorX + motorW - 5; vx += 3) {
    ctx.fillStyle = '#B45309'; // Copper armature coil glimpse
    ctx.fillRect(vx, motorY + 3, 1, motorH - 6);
    ctx.fillStyle = '#364323'; // Olive stator rib
    ctx.fillRect(vx + 1, motorY + 2, 1, motorH - 4);
  }

  // Charcoal Steel End Caps
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(motorX, motorY, 3, motorH);
  ctx.fillRect(motorX + motorW - 3, motorY, 3, motorH);
  ctx.fillStyle = '#475569';
  ctx.fillRect(motorX + motorW - 3, motorY, 1, motorH);

  // Motor Center Clamp Band & Silver Latch
  ctx.fillStyle = '#2A323D';
  ctx.fillRect(motorX + 9, motorY - 1, 3, motorH + 2);
  ctx.fillStyle = '#E2E8F0'; // Silver Latch
  ctx.fillRect(motorX + 10, motorY + 2, 2, 3);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(motorX + 10, motorY + 2, 1, 1);

  // ── LAYER 1: REAR CHASSIS SUPPORT BARS & TERMINAL BRACKET ──
  // Dual Lower Support Rods (Charcoal Steel)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-36, -3, 20, 4);
  ctx.fillRect(-36, 3, 20, 4);

  ctx.fillStyle = '#1E232B';
  ctx.fillRect(-35, -2, 18, 2);
  ctx.fillRect(-35, 4, 18, 2);

  ctx.fillStyle = '#475569'; // Rod top specular edge
  ctx.fillRect(-34, -2, 16, 1);
  ctx.fillRect(-34, 4, 16, 1);

  // Rear Terminal Cross-Brace Bracket (Military Olive Drab)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-37, -5, 4, 12);
  ctx.fillStyle = '#2C361C';
  ctx.fillRect(-36, -4, 2, 10);
  ctx.fillStyle = '#4A5A2F';
  ctx.fillRect(-36, -4, 2, 2);

  // ── LAYER 2: CENTRAL RECEIVER / ROTOR HOUSING ──
  const recX = -16;
  const recY = -8;
  const recW = 25;
  const recH = 12;

  // Main Receiver Dark Outer Contour
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(recX - 1, recY - 1, recW + 2, recH + 2);

  // Military Olive-Drab Armor Plate Body
  ctx.fillStyle = '#364323';
  ctx.fillRect(recX, recY, recW, recH);

  // Receiver Top Specular Highlight
  ctx.fillStyle = '#526435';
  ctx.fillRect(recX + 1, recY, recW - 2, 2);
  ctx.fillStyle = '#657C41';
  ctx.fillRect(recX + 3, recY, recW - 6, 1);

  // Receiver Underside Shadow
  ctx.fillStyle = '#1A2111';
  ctx.fillRect(recX, recY + recH - 2, recW, 2);

  // Charcoal Steel Structural Reinforcement Top Plate
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(recX + 2, recY + 1, recW - 4, 3);
  ctx.fillStyle = '#475569';
  ctx.fillRect(recX + 2, recY + 1, recW - 4, 1);

  // Top Stamped Inspection Plate & Amber Military Serial Marking
  ctx.fillStyle = '#11160C';
  ctx.fillRect(recX + 5, recY + 2, 10, 2);
  ctx.fillStyle = '#F59E0B'; // Military Stencil Bar
  ctx.fillRect(recX + 6, recY + 2, 8, 1);

  // Exposed Metallic Silver Hex Screws
  const hexXs = [recX + 3, recX + 16, recX + 20];
  for (let h = 0; h < hexXs.length; h++) {
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(hexXs[h], recY + 2, 2, 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(hexXs[h], recY + 2, 1, 1);
  }

  // Side Cylindrical Auxiliary Solenoid Housing (Charcoal Steel)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(recX + 1, recY + 5, 14, 5);
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(recX + 2, recY + 6, 12, 3);
  ctx.fillStyle = '#475569';
  ctx.fillRect(recX + 2, recY + 6, 12, 1);

  // Dual Butterfly Quick-Release T-Wing Nuts on Top Housing
  const tNuts = [recX + 5, recX + 17];
  for (let t = 0; t < tNuts.length; t++) {
    const tx = tNuts[t];
    // Vertical Stud
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(tx - 1, recY - 4, 3, 4);
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(tx, recY - 3, 1, 3);
    // Horizontal T-Wing Nut (Metallic Silver)
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(tx - 3, recY - 5, 7, 3);
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(tx - 2, recY - 4, 5, 1);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(tx - 1, recY - 4, 2, 1);
  }

  // Rear Rotor Block Collar (Charcoal Gunmetal Steel with Silver Bevel)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(recX + recW - 2, recY - 1, 4, recH + 2);
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(recX + recW - 1, recY, 2, recH);
  ctx.fillStyle = '#64748B';
  ctx.fillRect(recX + recW - 1, recY, 1, recH);

  // ── LAYER 3: 6-BARREL GATLING CLUSTER WITH DYNAMIC 3D ROTATIONAL PROJECTION ──
  const numBarrels = 6;
  const clusterR = 6.0;
  const barrelStartX = 11;
  const barrelEndX = 55;
  const barrelLen = barrelEndX - barrelStartX; // 44px

  // Central Axle Drive Shaft
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(barrelStartX, -2, barrelLen - 2, 4);
  ctx.fillStyle = '#181B22';
  ctx.fillRect(barrelStartX + 1, -1, barrelLen - 4, 2);
  // Rotating central axle flute highlight
  const axleY = snap(Math.sin(spinAngle * 3) * 0.8);
  ctx.fillStyle = '#475569';
  ctx.fillRect(barrelStartX + 2, axleY, barrelLen - 6, 1);

  // Dynamic 3D Barrel Calculation
  const barrels = [];
  for (let i = 0; i < numBarrels; i++) {
    const a = spinAngle + (i * Math.PI * 2) / numBarrels;
    const by = Math.sin(a) * clusterR;
    const depth = Math.cos(a); // -1.0 (back) to +1.0 (front)
    barrels.push({ idx: i, angle: a, y: snap(by), depth: depth });
  }

  // Sort by depth so back barrels render first, then clamp rings, then front barrels
  barrels.sort((a, b) => a.depth - b.depth);

  // Helper to draw a discrete pixel minigun barrel
  const drawPixelBarrel = (bY, depth, isFront) => {
    const isBack = !isFront;
    const bH = isFront ? 3 : 2;
    const tipLen = 8;
    const mainLen = barrelLen - tipLen;

    // Dark outline / shadow
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(barrelStartX, bY - 1, barrelLen, bH + 2);

    // Barrel body base color
    let bodyColor = isFront ? '#334155' : '#1E293B';
    let topSheen = isFront ? '#64748B' : '#334155';
    let specColor = isFront ? '#94A3B8' : '#475569';

    if (heat > 0.45) {
      bodyColor = (depth > 0) ? '#EA580C' : '#9A3412';
      topSheen = '#F59E0B';
      specColor = '#FEF08A';
    } else if (heat > 0.20) {
      bodyColor = (depth > 0) ? '#475569' : '#1E293B';
      topSheen = '#EA580C';
      specColor = '#F59E0B';
    }

    ctx.fillStyle = bodyColor;
    ctx.fillRect(barrelStartX + 1, bY, mainLen, bH);

    // Specular longitudinal metallic highlight on front barrels
    if (isFront) {
      ctx.fillStyle = topSheen;
      ctx.fillRect(barrelStartX + 2, bY, mainLen - 2, 1);
      ctx.fillStyle = specColor;
      ctx.fillRect(barrelStartX + 6, bY, (mainLen - 12) * 0.6, 1);
    }

    // Heat-Treated Muzzle Tip (Tempered Titanium Blue/Purple or Incandescent Molten Glow)
    const tipX = barrelStartX + mainLen;
    if (heat > 0.5) {
      // White-hot / molten orange tip
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(tipX, bY, tipLen - 2, bH);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(tipX + 1, bY, tipLen - 4, 1);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(tipX + tipLen - 3, bY, 2, bH);
    } else if (heat > 0.25) {
      // Cherry red / glowing tip
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(tipX, bY, tipLen - 2, bH);
      ctx.fillStyle = '#EA580C';
      ctx.fillRect(tipX + 1, bY, tipLen - 4, 1);
    } else {
      // Authentic Titanium Heat-Treated Blue/Purple Sheen
      ctx.fillStyle = '#2563EB'; // Royal heat blue
      ctx.fillRect(tipX, bY, 3, bH);
      ctx.fillStyle = '#4F46E5'; // Indigo/violet temper ring
      ctx.fillRect(tipX + 3, bY, 3, bH);
      ctx.fillStyle = '#1E232B'; // Charcoal muzzle crown
      ctx.fillRect(tipX + 6, bY, 2, bH);
    }

    // Barrel Bore Opening (Dark Hole at Muzzle Crown)
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(barrelEndX - 1, bY, 1, bH);
  };

  // Helper to draw a heavy pixel clamp ring
  const drawPixelClampRing = (ringX, isFrontMuzzle = false) => {
    const ringW = 4;
    const ringH = 18;
    const ringY = -9;

    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(ringX - 1, ringY - 1, ringW + 2, ringH + 2);

    let ringBody = '#364323'; // Military olive drab
    let ringHighlight = '#526435';
    let boltColor = '#E2E8F0';

    if (isFrontMuzzle && heat > 0.4) {
      ringBody = '#EA580C';
      ringHighlight = '#FEF08A';
      boltColor = '#FFFFFF';
    } else if (isFrontMuzzle && heat > 0.2) {
      ringBody = '#DC2626';
      ringHighlight = '#F59E0B';
    }

    ctx.fillStyle = ringBody;
    ctx.fillRect(ringX, ringY, ringW, ringH);

    // Top & center highlight bands
    ctx.fillStyle = ringHighlight;
    ctx.fillRect(ringX, ringY, ringW, 2);
    ctx.fillRect(ringX + 1, ringY + 5, 2, 8);

    // Dark perimeter cooling notches
    ctx.fillStyle = '#11160C';
    ctx.fillRect(ringX, ringY + 3, 1, 2);
    ctx.fillRect(ringX, ringY + 13, 1, 2);
    ctx.fillRect(ringX + ringW - 1, ringY + 3, 1, 2);
    ctx.fillRect(ringX + ringW - 1, ringY + 13, 1, 2);

    // Clamp Tension Silver Hex Bolts
    ctx.fillStyle = boltColor;
    ctx.fillRect(ringX + 1, ringY + 1, 2, 2);
    ctx.fillRect(ringX + 1, ringY + ringH - 3, 2, 2);
  };

  // 3A. Draw Back Barrels (depth < 0)
  for (let i = 0; i < barrels.length; i++) {
    const b = barrels[i];
    if (b.depth >= 0) continue;
    drawPixelBarrel(b.y, b.depth, false);
  }

  // 3B. Draw 3 Heavy Clamp Rings
  drawPixelClampRing(11, false); // Rear Collar Ring
  drawPixelClampRing(31, false); // Mid-Barrel Stabilizer Ring
  drawPixelClampRing(51, true);  // Front Muzzle Crown Ring

  // 3C. Draw Front Barrels (depth >= 0)
  for (let i = 0; i < barrels.length; i++) {
    const b = barrels[i];
    if (b.depth < 0) continue;
    drawPixelBarrel(b.y, b.depth, true);
  }

  // 3D. Rotational Motion Blur Ring when firing or spinning
  if (flashTimer > 0 || heat > 0.15) {
    ctx.fillStyle = (heat > 0.4) ? 'rgba(249, 115, 22, 0.45)' : 'rgba(148, 163, 184, 0.35)';
    ctx.fillRect(barrelStartX + 2, -7, barrelLen - 4, 1);
    ctx.fillRect(barrelStartX + 2, 7, barrelLen - 4, 1);
    ctx.fillRect(barrelEndX - 2, -8, 2, 16);
  }

  // ── LAYER 4: OVERHEAD HORIZONTAL BRIDGE SUPPORT STRUT & FORWARD CARRY HANDLE BRACKET ──
  const loopX = 8;
  const loopTopY = -18;
  const loopH = 26;

  // Upright Forward Carry Handle Loop Bracket (Olive Drab with Dark Core)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(loopX - 3, loopTopY - 1, 6, loopH + 2);

  ctx.fillStyle = '#364323';
  ctx.fillRect(loopX - 2, loopTopY, 4, loopH);

  ctx.fillStyle = '#4A5A2F'; // Highlight
  ctx.fillRect(loopX - 2, loopTopY, 2, loopH);

  // Oval Grip Hole in Loop Handle for front hand grip
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(loopX - 1, loopTopY + 3, 2, 8);

  // Forward Bracket Mounting Boss Collar (Charcoal Steel)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(loopX - 4, -7, 8, 13);
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(loopX - 3, -6, 6, 11);
  ctx.fillStyle = '#475569';
  ctx.fillRect(loopX - 3, -6, 6, 1);

  // Silver Hex Mounting Pin
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(loopX - 1, -2, 2, 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(loopX - 1, -2, 1, 1);

  // Overhead Horizontal Bridge Support Strut (Connecting Forward Loop to Rear Spade Grip)
  const bridgeStartX = loopX;
  const bridgeEndX = -36;
  const bridgeY = -15;
  const bridgeW = bridgeStartX - bridgeEndX;

  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(bridgeEndX - 1, bridgeY - 1, bridgeW + 2, 5);

  ctx.fillStyle = '#334155';
  ctx.fillRect(bridgeEndX, bridgeY, bridgeW, 3);

  ctx.fillStyle = '#64748B'; // Top metallic sheen
  ctx.fillRect(bridgeEndX, bridgeY, bridgeW, 1);

  // Front & Rear Strut Mounting Silver Bolts
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(bridgeStartX - 2, bridgeY - 1, 2, 2);
  ctx.fillRect(bridgeEndX + 2, bridgeY - 1, 2, 2);

  // ── LAYER 5: REAR CHAINSAW / JOYSTICK SPADE GRIP ──
  const gripX = -36;
  const gripTopY = -24;

  // Ergonomic Grip Outer Dark Contour
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(gripX - 9, gripTopY - 1, 12, 30);
  ctx.fillRect(gripX - 7, gripTopY + 28, 9, 3);

  // Heavy Matte Black Polymer / Rubber Grip Body
  ctx.fillStyle = '#0F1116';
  ctx.fillRect(gripX - 8, gripTopY, 10, 28);

  // Contoured Rear Spine Highlight
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(gripX + 1, gripTopY + 4, 1, 22);

  // Textured Scalloped Finger Grip Ribs (4 Finger Grooves)
  ctx.fillStyle = '#181B22';
  ctx.fillRect(gripX - 6, gripTopY + 6, 6, 18);

  ctx.fillStyle = '#282D37'; // Groove divider ribs
  for (let gy = gripTopY + 8; gy <= gripTopY + 20; gy += 4) {
    ctx.fillRect(gripX - 7, gy, 7, 1);
  }

  // Red/Amber Thumb Safety / Fire Toggle Switch on Top Horn
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(gripX - 5, gripTopY - 4, 6, 5);
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(gripX - 4, gripTopY - 3, 4, 3);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(gripX - 3, gripTopY - 3, 2, 1);

  // Glowing Green Status LED
  ctx.fillStyle = '#22C55E';
  ctx.fillRect(gripX - 3, gripTopY - 1, 2, 2);
  ctx.fillStyle = '#86EFAC';
  ctx.fillRect(gripX - 3, gripTopY - 1, 1, 1);

  // ── LAYER 6: TUMBLING 7.62MM SPENT BRASS CASINGS & DISINTEGRATING LINKS SHOWER ──
  if (flashTimer > 0 || recoil > 1.5) {
    const casings = [
      { dx: -6, dy: 12, angle: spinAngle * 2.5 },
      { dx: -12, dy: 20, angle: spinAngle * 3.0 + 1.2 },
      { dx: -18, dy: 28, angle: spinAngle * 3.5 + 2.4 }
    ];
    for (let c = 0; c < casings.length; c++) {
      const cs = casings[c];
      ctx.save();
      ctx.translate(snap(motorX + 4 + cs.dx), snap(motorY + motorH + cs.dy));
      ctx.rotate(cs.angle);

      // Heavy 7.62mm Brass Shell Casing
      ctx.fillStyle = '#0B0D12';
      ctx.fillRect(-4, -2, 8, 4);

      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-3, -1, 6, 2);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(-3, -1, 4, 1);
      ctx.fillStyle = '#B45309'; // Extractor rim
      ctx.fillRect(-3, 0, 1, 1);

      ctx.restore();
    }

    // Disintegrating Dark Steel Belt Link Clip
    ctx.save();
    ctx.translate(snap(motorX - 2), snap(motorY + motorH + 16));
    ctx.rotate(-spinAngle * 2.8);
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(-3, -2, 6, 4);
    ctx.fillStyle = '#1E232B';
    ctx.fillRect(-2, -1, 4, 2);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-2, -1, 3, 1);
    ctx.restore();
  }

  // ── LAYER 7: MULTI-TIER ROTATIONAL PIXEL STARBURST MUZZLE FLASH ──
  if (flashTimer > 0) {
    const mX = barrelEndX + 2;
    const mY = 0;

    // 1. Gas Venting Jets (Top and Bottom radial vents)
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(mX - 4, -14, 2, 4);
    ctx.fillRect(mX - 3, -12, 2, 4);
    ctx.fillRect(mX - 4, 10, 2, 4);
    ctx.fillRect(mX - 3, 8, 2, 4);

    // 2. Fiery Outer Starburst Blast Spikes (Orange & Crimson)
    ctx.fillStyle = '#EA580C';
    // Forward primary spike
    ctx.fillRect(mX, -2, 24, 4);
    ctx.fillRect(mX + 24, -1, 6, 2);
    // Vertical spikes
    ctx.fillRect(mX + 2, -10, 4, 20);
    ctx.fillRect(mX + 3, -14, 2, 28);
    // 45° Diagonal spikes
    ctx.fillRect(mX + 6, -8, 4, 4);
    ctx.fillRect(mX + 10, -12, 3, 3);
    ctx.fillRect(mX + 6, 4, 4, 4);
    ctx.fillRect(mX + 10, 9, 3, 3);

    // 3. Golden Yellow Mid-Burst Petals
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(mX + 1, -3, 16, 6);
    ctx.fillRect(mX + 2, -7, 4, 14);
    ctx.fillRect(mX + 4, -5, 8, 10);
    ctx.fillRect(mX + 12, -2, 6, 4);

    // 4. White-Hot Incandescent Star Core
    ctx.fillStyle = '#FEF08A';
    ctx.fillRect(mX + 1, -2, 10, 4);
    ctx.fillRect(mX + 3, -4, 4, 8);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(mX + 2, -1, 6, 2);
    ctx.fillRect(mX + 4, -3, 2, 6);

    // 5. High-Velocity Ballistic Pixel Sparks
    const sparkOffsets = [
      { x: mX + 22, y: -6, s: 2, c: '#FFFFFF' },
      { x: mX + 28, y: 3, s: 2, c: '#FEF08A' },
      { x: mX + 34, y: -2, s: 3, c: '#F59E0B' },
      { x: mX + 20, y: 8, s: 2, c: '#EA580C' },
      { x: mX + 16, y: -12, s: 2, c: '#FBBF24' }
    ];
    for (let sp = 0; sp < sparkOffsets.length; sp++) {
      const spo = sparkOffsets[sp];
      ctx.fillStyle = spo.c;
      ctx.fillRect(spo.x, spo.y, spo.s, spo.s);
    }
  }

  ctx.restore();
}

/**
 * Standalone M134 Minigun (Handheld Vulcan) renderer for Weapon Studio / UI screens & in-game CJ Ultimate
 * Authentic Grand Theft Auto: San Andreas Military-Industrial Aesthetic:
 * - Receiver and Housing: Matte military olive drab / dark army green with charcoal steel reinforcement plates
 * - Barrels: Polished steel with subtle metallic blue-gray sheen, dark cooling vents, and burnt heat-treated tips
 * - Feed Chute & Drive Motor: Heavy black polymer / rubberized canvas segmented feed chute with olive-drab motor housing
 * - Hardware: Exposed metallic silver hex bolts, latches, wing-nuts, and dark iron mounting brackets
 * - Rear Ergonomic Chainsaw Joystick Grip with 4 scalloped finger grooves, red toggle horn, and status LED
 * - Overheat Thermal Glow curve (heat shimmer & molten glowing barrel tips)
 * - Multi-layered Rotational Starburst Muzzle Flash
 * Rule 11 (Zero shadowBlur) & Rule 20 Compliant
 */
export function drawCjMinigun(ctx, x = 0, y = 0, gunAngle = 0, r = 25, opts = {}) {
  if (_isDarkMode()) {
    drawCjPixelMinigun(ctx, x, y, gunAngle, r, opts);
    return;
  }

  _initMinigunGradients(ctx);

  ctx.save();
  let posX = x;
  let posY = y;
  let angle = 0;
  let scale = 1.0;

  if (typeof gunAngle === 'object') {
    opts = gunAngle;
    scale = opts.scale || 1.0;
  } else if (typeof gunAngle === 'number') {
    angle = gunAngle;
    if (typeof r === 'number') {
      posX = x + (r * 0.75);
      posY = y;
      scale = (opts && opts.scale) ? opts.scale : 1.10;
    } else if (typeof r === 'object') {
      opts = r;
      scale = opts.scale || 1.0;
    }
  }

  const recoil = (opts && opts.recoil) ? opts.recoil : 0;
  const flashTimer = (opts && opts.flashTimer) ? opts.flashTimer : 0;
  const heat = (opts && opts.heat) ? Math.min(1.0, Math.max(0, opts.heat)) : 0;
  const spinAngle = (opts && opts.spinAngle !== undefined) ? opts.spinAngle : 0;

  ctx.translate(posX - recoil, posY);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // ── LAYER 0: UNDERSLUNG DRIVE MOTOR POD & HEAVY RUBBERIZED CANVAS AMMO FEED CHUTE ──
  const motorX = -8.0;
  const motorY = 4.5;
  const motorW = 22.0;
  const motorH = 9.5;

  // Heavy Flexible Rubberized Canvas Ammo Feed Chute with Metallic Articulated Links
  ctx.strokeStyle = '#090B0E';
  ctx.lineWidth = 3.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(motorX + 2.0, motorY + motorH * 0.65);
  ctx.quadraticCurveTo(motorX - 12.0, motorY + motorH + 4.0, -31.0, motorY + 4.5);
  ctx.stroke();

  // Rubberized Canvas Inner Belt
  ctx.strokeStyle = '#1E2515'; // Dark Army Canvas Green
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(motorX + 2.0, motorY + motorH * 0.65);
  ctx.quadraticCurveTo(motorX - 12.0, motorY + motorH + 4.0, -31.0, motorY + 4.5);
  ctx.stroke();

  // Metallic Silver Link Segments along Chute
  ctx.fillStyle = '#CBD5E1';
  [-26.0, -21.0, -16.0, -11.0].forEach(lx => {
    ctx.fillRect(lx, motorY + motorH - 0.5, 1.4, 2.8);
  });

  // Cylindrical Motor Pod Body (Matte Military Olive-Drab Finish - Cached)
  ctx.fillStyle = _cachedMinigunMotorGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(motorX, motorY, motorW, motorH, 2.5);
  ctx.fill();
  ctx.stroke();

  // Dark Stator Vents in Center Window
  ctx.fillStyle = '#11160C';
  ctx.fillRect(motorX + 5.0, motorY + 1.2, motorW - 10.0, motorH - 2.4);
  ctx.strokeStyle = '#364323';
  ctx.lineWidth = 0.8;
  for (let cx = motorX + 6.0; cx < motorX + motorW - 6.0; cx += 1.6) {
    ctx.beginPath();
    ctx.moveTo(cx, motorY + 1.2);
    ctx.lineTo(cx, motorY + motorH - 1.2);
    ctx.stroke();
  }

  // Front & Rear Motor Heavy End Caps (Charcoal Steel)
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(motorX + motorW - 2.5, motorY, 2.5, motorH);
  ctx.fillRect(motorX, motorY, 2.5, motorH);

  // Motor Center Dark Iron Clamp Strap & Silver Latch Pin
  ctx.fillStyle = '#2A323D';
  ctx.fillRect(motorX + motorW * 0.45 - 1.2, motorY - 0.5, 2.8, motorH + 1.0);
  ctx.fillStyle = '#E2E8F0'; // Silver Latch
  ctx.fillRect(motorX + motorW * 0.45 - 0.6, motorY + 2.0, 1.6, 2.0);

  // ── LAYER 1: REAR FRAME SUPPORT TUBES & CHASSIS BARS ──
  // Dual Lower Support Bars (Charcoal Steel) connecting Main Receiver to Rear Grip
  ctx.fillStyle = '#1E232B';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  // Upper rear rod
  ctx.fillRect(-34.0, -2.5, 18.0, 2.2);
  ctx.strokeRect(-34.0, -2.5, 18.0, 2.2);
  // Lower rear rod
  ctx.fillRect(-34.0, 3.2, 18.0, 2.2);
  ctx.strokeRect(-34.0, 3.2, 18.0, 2.2);

  // Rear Terminal Cross-Brace Bracket (Military Olive Drab)
  ctx.fillStyle = '#2C361C';
  ctx.fillRect(-34.5, -4.0, 3.5, 10.5);
  ctx.strokeRect(-34.5, -4.0, 3.5, 10.5);

  // ── LAYER 2: CENTRAL RECEIVER / ROTOR HOUSING (MATTE MILITARY OLIVE DRAB & CHARCOAL STEEL) ──
  const recX = -16.0;
  const recY = -7.5;
  const recW = 25.0;
  const recH = 12.0;

  // Military Olive-Drab Upper Receiver Housing (Cached)
  ctx.fillStyle = _cachedMinigunRecGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.roundRect(recX, recY, recW, recH, 2.0);
  ctx.fill();
  ctx.stroke();

  // Heavy Gunmetal / Charcoal Steel Structural Reinforcement Plates
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(recX + 2.0, recY + 1.0, recW - 4.0, 2.6);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 0.6;
  ctx.strokeRect(recX + 2.0, recY + 1.0, recW - 4.0, 2.6);

  // Top Stamped Inspection Plate & Military Serial Marking
  ctx.fillStyle = '#11160C';
  ctx.fillRect(recX + 5.0, recY + 1.4, 10.0, 1.8);
  ctx.fillStyle = '#F59E0B'; // Military Stencil Bar
  ctx.fillRect(recX + 6.0, recY + 1.8, 8.0, 0.8);

  // Exposed Metallic Silver Hex Screws on Top Housing
  [recX + 4.0, recX + 16.0, recX + 21.0].forEach(hx => {
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.arc(hx, recY + 2.3, 0.7, 0, Math.PI * 2);
    ctx.fill();
  });

  // Side Cylindrical Auxiliary Solenoid / Housing (Charcoal Steel)
  ctx.fillStyle = '#1E232B';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.roundRect(recX + 1.5, recY + 4.2, 14.5, 4.0, 1.2);
  ctx.fill();
  ctx.stroke();

  // 2 Chrome / Silver Butterfly Quick-Release Screws on top of housing
  const tScrewXs = [recX + 6.0, recX + 17.5];
  for (let i = 0; i < tScrewXs.length; i++) {
    const tx = tScrewXs[i];
    // Vertical Stud
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(tx - 0.8, recY - 2.8, 1.6, 3.2);
    // Horizontal T-Wing Nut (Metallic Silver)
    ctx.fillStyle = '#E2E8F0';
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.roundRect(tx - 2.8, recY - 4.2, 5.6, 1.6, 0.6);
    ctx.fill();
    ctx.stroke();
  }

  // Rear Rotor Block Collar (Charcoal Gunmetal Steel with Silver Bevel)
  ctx.fillStyle = '#1E232B';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.fillRect(recX + recW - 2.5, recY - 1.0, 3.5, recH + 2.0);
  ctx.strokeRect(recX + recW - 2.5, recY - 1.0, 3.5, recH + 2.0);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 0.6;
  ctx.strokeRect(recX + recW - 2.0, recY - 0.5, 2.5, recH + 1.0);

  // ── LAYER 3: 6-BARREL GATLING CLUSTER WITH ROTATIONAL 3D MOTION BLUR & DEPTH SORTING ──
  const numBarrels = 6;
  const clusterR = 6.2;
  const barrelStartX = 11.0;
  const barrelEndX = 56.0;
  const barrelLen = barrelEndX - barrelStartX;

  // Rotational Motion Blur Ring when barrels are spinning rapidly
  if (flashTimer > 0 || heat > 0.15) {
    ctx.save();
    ctx.strokeStyle = `rgba(148, 163, 184, ${(0.15 + heat * 0.25).toFixed(2)})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(barrelStartX + barrelLen * 0.5, 0, barrelLen * 0.5, clusterR, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Muzzle Crown Motion Blur Ring with heat tint
    ctx.strokeStyle = (heat > 0.4) ? `rgba(249, 115, 22, ${(heat * 0.45).toFixed(2)})` : 'rgba(100, 116, 139, 0.25)';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.ellipse(barrelEndX, 0, 1.5, clusterR + 0.8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Central Axle Drive Shaft (Dark Parkerized Gunmetal with rotating faceted highlights)
  ctx.fillStyle = '#181B22';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.8;
  ctx.fillRect(barrelStartX, -1.2, barrelLen - 2.0, 2.4);
  ctx.strokeRect(barrelStartX, -1.2, barrelLen - 2.0, 2.4);

  // Rotating Axle Center Flute Highlight
  const axleFluteY = Math.sin(spinAngle * 3) * 0.8;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fillRect(barrelStartX + 2.0, axleFluteY - 0.4, barrelLen - 6.0, 0.8);

  // Calculate 3D barrel projections
  const barrels = [];
  for (let i = 0; i < numBarrels; i++) {
    const a = spinAngle + (i * Math.PI * 2) / numBarrels;
    const by = Math.sin(a) * clusterR;
    const depth = Math.cos(a); // -1 (back) to +1 (front)
    barrels.push({ idx: i, angle: a, y: by, depth: depth });
  }

  // Sort by depth so back barrels render first, then clamp rings, then front barrels
  barrels.sort((a, b) => a.depth - b.depth);

  // A. Render Back Barrels (depth < 0)
  for (let i = 0; i < barrels.length; i++) {
    const b = barrels[i];
    if (b.depth >= 0) continue;

    _drawSingleMinigunBarrel(ctx, barrelStartX, b.y, barrelLen, b.depth, heat);
  }

  // B. Render the 3 Heavy Charcoal & Olive Drab Clamp Rings
  // Clamp 1: Rear Rotor Collar (x = 10.5)
  _drawMinigunClampRing(ctx, 10.5, -8.0, 3.6, 16.0);
  // Clamp 2: Mid-Barrel Stabilizer Ring (x = 31.5)
  _drawMinigunClampRing(ctx, 31.5, -8.0, 3.6, 16.0);
  // Clamp 3: Front Muzzle Clamp Ring (x = 52.5)
  _drawMinigunClampRing(ctx, 52.5, -8.0, 3.6, 16.0);

  // C. Render Front Barrels (depth >= 0) on top of clamp rings
  for (let i = 0; i < barrels.length; i++) {
    const b = barrels[i];
    if (b.depth < 0) continue;

    _drawSingleMinigunBarrel(ctx, barrelStartX, b.y, barrelLen, b.depth, heat);
  }

  // ── LAYER 4: FORWARD UPRIGHT CARRY HANDLE LOOP BRACKET (MILITARY OLIVE DRAB) ──
  const loopX = 8.5;
  const loopTopY = -18.5;
  const loopH = 25.5;

  // Upright Bracket Loop Ring (Olive Drab with Dark Iron Core - Cached)
  ctx.fillStyle = _cachedMinigunLoopGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.roundRect(loopX - 2.5, loopTopY, 5.0, loopH, [2.5, 2.5, 1.5, 1.5]);
  ctx.fill();
  ctx.stroke();

  // Oval Hole in Loop Handle for front hand grip
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.roundRect(loopX - 1.2, loopTopY + 2.5, 2.4, 7.5, 1.2);
  ctx.fill();

  // Forward Bracket Mounting Boss Collar (Charcoal Steel)
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(loopX - 3.2, -6.5, 6.4, 11.5);
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(loopX - 3.2, -6.5, 6.4, 11.5);

  // Exposed Hex Mounting Pin on Bracket
  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  ctx.arc(loopX, -1.0, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // ── LAYER 5: OVERHEAD HORIZONTAL BRIDGE SUPPORT STRUT ──
  const bridgeStartX = loopX + 1.0;
  const bridgeEndX = -35.0;
  const bridgeY = -14.5;
  const bridgeH = 2.8;

  ctx.fillStyle = _cachedMinigunBridgeGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(bridgeStartX, bridgeY);
  ctx.lineTo(bridgeEndX, bridgeY);
  ctx.lineTo(bridgeEndX - 2.5, bridgeY + bridgeH + 2.0);
  ctx.lineTo(bridgeEndX, bridgeY + bridgeH);
  ctx.lineTo(bridgeStartX, bridgeY + bridgeH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Front & Rear Strut Mounting Metallic Silver Hex Bolts
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(bridgeStartX - 2.0, bridgeY - 0.5, 1.6, 1.6);
  ctx.fillRect(bridgeEndX + 1.5, bridgeY - 0.5, 1.6, 1.6);

  // ── LAYER 6: REAR CHAINSAW / JOYSTICK SPADE GRIP (HEAVY MATTE BLACK RUBBER) ──
  const gripX = -36.5;
  const gripTopY = -23.5;

  ctx.save();
  // Ergonomic Grip Body with 4 Scalloped Finger Grooves
  ctx.fillStyle = '#0F1116';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.4;

  ctx.beginPath();
  ctx.moveTo(gripX + 1.5, gripTopY);                // Top rear horn
  ctx.lineTo(gripX - 5.5, gripTopY + 2.5);          // Horn top curve
  ctx.lineTo(gripX - 7.5, gripTopY + 7.0);          // Upper thumb web
  // 4 Scalloped Finger Grooves on front face
  ctx.lineTo(gripX - 6.0, gripTopY + 11.0);         // Finger 1 notch
  ctx.lineTo(gripX - 7.8, gripTopY + 13.5);
  ctx.lineTo(gripX - 6.0, gripTopY + 16.5);         // Finger 2 notch
  ctx.lineTo(gripX - 7.8, gripTopY + 19.0);
  ctx.lineTo(gripX - 6.0, gripTopY + 22.0);         // Finger 3 notch
  ctx.lineTo(gripX - 7.5, gripTopY + 24.5);
  ctx.lineTo(gripX - 5.0, gripTopY + 27.5);         // Bottom finger 4 & flared heel
  ctx.lineTo(gripX + 2.0, gripTopY + 26.0);         // Rear heel
  ctx.lineTo(gripX + 1.0, gripTopY + 6.0);          // Rear spine
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rubber Textured Grip Rib Inset
  ctx.fillStyle = '#181B22';
  ctx.beginPath();
  ctx.moveTo(gripX - 4.2, gripTopY + 6.5);
  ctx.lineTo(gripX - 5.2, gripTopY + 23.5);
  ctx.lineTo(gripX - 1.0, gripTopY + 23.0);
  ctx.lineTo(gripX - 0.5, gripTopY + 6.5);
  ctx.closePath();
  ctx.fill();

  // Finger groove divide lines
  ctx.strokeStyle = '#282D37';
  ctx.lineWidth = 0.8;
  for (let gy = gripTopY + 12.0; gy <= gripTopY + 22.0; gy += 4.2) {
    ctx.beginPath();
    ctx.moveTo(gripX - 6.5, gy);
    ctx.lineTo(gripX - 1.5, gy);
    ctx.stroke();
  }

  // Red/Amber Thumb Safety / Fire Toggle Switch on Top Horn
  ctx.fillStyle = '#DC2626';
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(gripX - 3.5, gripTopY - 2.5, 4.5, 3.2, 0.8);
  ctx.fill();
  ctx.stroke();

  // Safety status indicator LED
  ctx.fillStyle = '#22C55E';
  ctx.fillRect(gripX - 2.0, gripTopY - 1.5, 1.5, 1.2);

  ctx.restore();

  // ── LAYER 7: TUMBLING 7.62MM SPENT BRASS CASINGS & DISINTEGRATING LINKS SHOWER ──
  if (flashTimer > 0 || (recoil > 2.0)) {
    ctx.save();
    const casingSeeds = [
      { dx: -6.0, dy: 10.0, rot: spinAngle * 2.2, scale: 1.0 },
      { dx: -12.0, dy: 18.0, rot: spinAngle * 2.8 + 1.2, scale: 0.9 },
      { dx: -18.0, dy: 26.0, rot: spinAngle * 3.4 + 2.4, scale: 0.8 }
    ];

    for (let c = 0; c < casingSeeds.length; c++) {
      const cs = casingSeeds[c];
      ctx.save();
      ctx.translate(motorX + 4.0 + cs.dx, motorY + motorH + cs.dy);
      ctx.rotate(cs.rot);
      ctx.scale(cs.scale, cs.scale);

      // Heavy 7.62mm Brass Shell Casing
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.roundRect(-3.2, -1.2, 6.4, 2.4, 0.5);
      ctx.fill();
      ctx.stroke();

      // Rim & Extractor Groove
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(-3.0, -0.9, 1.2, 1.8);
      ctx.restore();
    }

    // Disintegrating Dark Steel Belt Link Clip
    ctx.save();
    ctx.translate(motorX - 2.0, motorY + motorH + 14.0);
    ctx.rotate(-spinAngle * 2.5);
    ctx.fillStyle = '#1E232B';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.roundRect(-2.2, -1.8, 4.4, 3.6, 0.8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // ── LAYER 8: REALISTIC MULTI-BARREL ROTATIONAL STARBURST MUZZLE FLASH & BARREL JETS ──
  if (flashTimer > 0) {
    _drawMinigunRotationalMuzzleFlash(ctx, barrelEndX + 2.0, 0, 1.65, spinAngle, heat);
  }

  ctx.restore();
}

let _cachedTopBarrelGrad = null;
let _cachedBottomBarrelGrad = null;
let _cachedHeatGrad = null;
let _cachedClampGrad = null;
let _cachedMinigunMotorGrad = null;
let _cachedMinigunRecGrad = null;
let _cachedMinigunLoopGrad = null;
let _cachedMinigunBridgeGrad = null;

function _initMinigunGradients(ctx) {
  if (_cachedTopBarrelGrad) return;

  _cachedTopBarrelGrad = ctx.createLinearGradient(0, -1.2, 0, 1.2);
  _cachedTopBarrelGrad.addColorStop(0.00, '#384556');
  _cachedTopBarrelGrad.addColorStop(0.25, '#71829B');
  _cachedTopBarrelGrad.addColorStop(0.50, '#94A3B8');
  _cachedTopBarrelGrad.addColorStop(0.80, '#475569');
  _cachedTopBarrelGrad.addColorStop(1.00, '#1E252F');

  _cachedBottomBarrelGrad = ctx.createLinearGradient(0, -1.2, 0, 1.2);
  _cachedBottomBarrelGrad.addColorStop(0.00, '#1E252F');
  _cachedBottomBarrelGrad.addColorStop(0.50, '#384556');
  _cachedBottomBarrelGrad.addColorStop(1.00, '#0E1116');

  _cachedHeatGrad = ctx.createLinearGradient(0, 0, 14, 0);
  _cachedHeatGrad.addColorStop(0.0, 'rgba(56, 69, 86, 0)');
  _cachedHeatGrad.addColorStop(0.5, 'rgba(76, 94, 130, 0.40)');
  _cachedHeatGrad.addColorStop(0.8, 'rgba(120, 90, 50, 0.35)');
  _cachedHeatGrad.addColorStop(1.0, 'rgba(30, 37, 47, 0.60)');

  _cachedClampGrad = ctx.createLinearGradient(0, -8, 0, 8);
  _cachedClampGrad.addColorStop(0.00, '#2A323D');
  _cachedClampGrad.addColorStop(0.25, '#475569');
  _cachedClampGrad.addColorStop(0.70, '#1E232B');
  _cachedClampGrad.addColorStop(1.00, '#0F1217');

  const motorY = 4.5;
  const motorH = 9.5;
  _cachedMinigunMotorGrad = ctx.createLinearGradient(0, motorY, 0, motorY + motorH);
  _cachedMinigunMotorGrad.addColorStop(0.00, '#364323');
  _cachedMinigunMotorGrad.addColorStop(0.30, '#4A5A2F');
  _cachedMinigunMotorGrad.addColorStop(0.70, '#2C361C');
  _cachedMinigunMotorGrad.addColorStop(1.00, '#161D0E');

  const recY = -7.5;
  const recH = 12.0;
  _cachedMinigunRecGrad = ctx.createLinearGradient(0, recY, 0, recY + recH);
  _cachedMinigunRecGrad.addColorStop(0.00, '#364323');
  _cachedMinigunRecGrad.addColorStop(0.25, '#526435');
  _cachedMinigunRecGrad.addColorStop(0.60, '#364323');
  _cachedMinigunRecGrad.addColorStop(1.00, '#1A2111');

  const loopTopY = -18.5;
  const loopH = 25.5;
  _cachedMinigunLoopGrad = ctx.createLinearGradient(0, loopTopY, 0, loopTopY + loopH);
  _cachedMinigunLoopGrad.addColorStop(0.0, '#364323');
  _cachedMinigunLoopGrad.addColorStop(0.5, '#4A5A2F');
  _cachedMinigunLoopGrad.addColorStop(1.0, '#212915');

  const bridgeY = -14.5;
  const bridgeH = 2.8;
  _cachedMinigunBridgeGrad = ctx.createLinearGradient(0, bridgeY, 0, bridgeY + bridgeH);
  _cachedMinigunBridgeGrad.addColorStop(0.0, '#475569');
  _cachedMinigunBridgeGrad.addColorStop(0.4, '#64748B');
  _cachedMinigunBridgeGrad.addColorStop(1.0, '#1E232B');
}

/**
 * Helper to draw a single 3D shaded Gatling barrel (Polished Steel with Metallic Blue-Gray Sheen & Heat-Treated Muzzle Tip)
 * High-performance optimized with cached module gradients
 */
function _drawSingleMinigunBarrel(ctx, startX, y, len, depth, heat) {
  _initMinigunGradients(ctx);
  const barrelH = 2.4;
  const isTopShaded = (depth >= 0);

  ctx.save();
  ctx.translate(startX, y);

  // Polished Steel Gradient with Metallic Blue-Gray Sheen (Cached)
  ctx.fillStyle = isTopShaded ? _cachedTopBarrelGrad : _cachedBottomBarrelGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 0.8;
  ctx.fillRect(0, -barrelH * 0.5, len, barrelH);
  ctx.strokeRect(0, -barrelH * 0.5, len, barrelH);

  // Heat-Treated Burnt Blued/Bronze Tint near Muzzle Tip (Cached)
  const heatTreatedLen = 14.0;
  const heatStartX = len - heatTreatedLen;
  ctx.save();
  ctx.translate(heatStartX, 0);
  ctx.fillStyle = _cachedHeatGrad;
  ctx.fillRect(0, -barrelH * 0.5, heatTreatedLen, barrelH);
  ctx.restore();

  // Dark 9mm Barrel Bore Opening Crown & Dark Cooling Vents
  ctx.fillStyle = '#020617';
  ctx.beginPath();
  ctx.ellipse(len, 0, 0.6, barrelH * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // Dark cooling vent slot on barrel tip
  ctx.fillStyle = '#090B0E';
  ctx.fillRect(len - 3.5, -barrelH * 0.3, 2.0, barrelH * 0.6);

  // Overheat Thermal Glow (Incandescent orange to white-hot at high RPM)
  if (heat > 0.04) {
    const tipGlowLen = Math.min(26, 12 + heat * 20);
    const tipStartX = len - tipGlowLen;
    ctx.fillStyle = `rgba(251, 191, 36, ${(heat * 0.85).toFixed(2)})`;
    ctx.fillRect(tipStartX, -barrelH * 0.5, tipGlowLen, barrelH);
    ctx.fillStyle = `rgba(255, 255, 255, ${(heat * 0.90).toFixed(2)})`;
    ctx.fillRect(len - 6.0, -barrelH * 0.35, 6.0, barrelH * 0.7);
  }

  ctx.restore();
}

/**
 * Helper to draw a heavy-duty military clamp collar ring (Charcoal Steel & Olive Drab Reinforcement)
 * High-performance optimized with cached gradient
 */
function _drawMinigunClampRing(ctx, x, y, w, h) {
  _initMinigunGradients(ctx);

  ctx.save();
  ctx.translate(x, 0);

  // Heavy Charcoal Gunmetal Ring Body (Cached)
  ctx.fillStyle = _cachedClampGrad;
  ctx.strokeStyle = '#020617';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.roundRect(0, y, w, h, 1.2);
  ctx.fill();
  ctx.stroke();

  // Army Olive-Drab Center Band
  ctx.fillStyle = '#364323';
  ctx.fillRect(0.8, y + 2.0, w - 1.6, h - 4.0);

  // Center Hub Darkening & Machined Ring Recesses
  ctx.fillStyle = '#020617';
  ctx.fillRect(0.8, -2.5, w - 1.6, 5.0);
  ctx.fillRect(0.8, y + 1.0, w - 1.6, 1.2);
  ctx.fillRect(0.8, y + h - 2.2, w - 1.6, 1.2);

  ctx.restore();
}

let _cachedMuzzleGlowGrad = null;

function _getMuzzleGlowGrad(ctx, glowR) {
  if (!_cachedMuzzleGlowGrad) {
    _cachedMuzzleGlowGrad = ctx.createRadialGradient(4, 0, 0, 4, 0, 48);
    _cachedMuzzleGlowGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.98)');
    _cachedMuzzleGlowGrad.addColorStop(0.25, 'rgba(254, 240, 138, 0.88)');
    _cachedMuzzleGlowGrad.addColorStop(0.55, 'rgba(249, 115, 22, 0.55)');
    _cachedMuzzleGlowGrad.addColorStop(0.82, 'rgba(220, 38, 38, 0.20)');
    _cachedMuzzleGlowGrad.addColorStop(1.0, 'rgba(220, 38, 38, 0)');
  }
  return _cachedMuzzleGlowGrad;
}

/**
 * Helper to draw tactical high-velocity M4-style rotational muzzle flash & spark effects for M134 Minigun
 * Inspired by John Wick's TTI M4 Rifle: Supersonic cyan shock ring, Mach diamonds, 8-point stretched starburst, and forward powder sparks
 * Hyper-dynamic animation to ensure zero static/stuck visual appearance during rapid continuous firing.
 */
function _drawMinigunRotationalMuzzleFlash(ctx, x, y, scale = 1.0, spinAngle = 0, heat = 0.5) {
  ctx.save();
  ctx.translate(x, y);

  const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const flicker = 0.85 + Math.sin(now * 0.08 + spinAngle * 3.5) * 0.18 + (Math.random() - 0.5) * 0.12;
  const progress = scale * Math.max(0.65, flicker);
  const alpha = Math.min(1.0, 0.95 * Math.max(0.6, flicker));

  // 1. Supersonic Cyan-Blue Vapor Shock Ring (Pulsing expansion shockwave)
  const ringRadius = (14 + ((now * 0.06 + spinAngle * 8) % 18)) * scale;
  const ringAlpha = Math.max(0, 1.0 - (ringRadius / (32 * scale))) * 0.55 * alpha;
  ctx.strokeStyle = `rgba(56, 189, 248, ${ringAlpha.toFixed(3)})`;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(8 * progress, 0, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Volumetric Radiant Atmospheric Fireball Glow
  const glowR = 48 * progress;
  ctx.save();
  ctx.scale(glowR / 48, glowR / 48);
  ctx.fillStyle = _getMuzzleGlowGrad(ctx, 48);
  ctx.beginPath();
  ctx.arc(4, 0, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 3. Multi-Port Gas Compensator Vents (6 Angled Radial Jets matching revolving barrel crowns)
  ctx.save();
  ctx.rotate(spinAngle);
  for (let b = 0; b < 6; b++) {
    const ba = (b * Math.PI * 2) / 6;
    const vLen = (20 + Math.sin(now * 0.05 + b) * 4) * progress;
    const vx = Math.cos(ba) * vLen;
    const vy = Math.sin(ba) * vLen;

    ctx.fillStyle = `rgba(251, 191, 36, ${0.85 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(-1 + vx, vy);
    ctx.lineTo(2, 0);
    ctx.closePath();
    ctx.fill();

    // White-hot vent root
    ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(-1 + vx * 0.45, vy * 0.45);
    ctx.lineTo(1, 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 4. Forward Conical Combustion Flame Plume (Dynamic fluttering length)
  const coneLen = (42 + Math.sin(now * 0.09) * 10 + (Math.random() - 0.5) * 6) * scale;
  ctx.fillStyle = `rgba(254, 215, 170, ${0.90 * alpha})`;
  ctx.beginPath();
  ctx.moveTo(-3, -5.0 * progress);
  ctx.lineTo(coneLen * 0.72, -12 * progress);
  ctx.lineTo(coneLen, 0);
  ctx.lineTo(coneLen * 0.72, 12 * progress);
  ctx.lineTo(-3, 5.0 * progress);
  ctx.closePath();
  ctx.fill();

  // 5. 8-Point Aggressive Stretched Starburst Flare (Forward Horizontal Elongation)
  ctx.save();
  ctx.rotate(spinAngle * 0.4);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
  ctx.strokeStyle = `rgba(245, 158, 11, ${0.85 * alpha})`;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  const starPoints = 8;
  const outerStarR = (26 + Math.sin(now * 0.1) * 4) * progress;
  const innerStarR = 8 * progress;
  for (let i = 0; i < starPoints * 2; i++) {
    const spAngle = (i * Math.PI) / starPoints;
    const R = (i % 2 === 0) ? outerStarR : innerStarR;
    const stretchX = (i % 2 === 0 && Math.cos(spAngle) > 0) ? 2.2 : 1.0;
    const sx = Math.cos(spAngle) * R * stretchX;
    const sy = Math.sin(spAngle) * R;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 6. Supersonic Mach Expansion Shock Diamonds (Oscillating Mach Discs)
  const machJitter = Math.sin(now * 0.06 + spinAngle * 2) * 2.0;
  // First Mach Diamond
  ctx.fillStyle = `rgba(255, 255, 255, ${1.0 * alpha})`;
  ctx.strokeStyle = `rgba(253, 224, 71, ${0.95 * alpha})`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo((11 + machJitter) * progress, 0);
  ctx.lineTo((18 + machJitter) * progress, -4.5 * progress);
  ctx.lineTo((25 + machJitter) * progress, 0);
  ctx.lineTo((18 + machJitter) * progress, 4.5 * progress);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Second Mach Diamond (Further out)
  ctx.beginPath();
  ctx.moveTo((30 + machJitter * 1.5) * progress, 0);
  ctx.lineTo((36 + machJitter * 1.5) * progress, -3.2 * progress);
  ctx.lineTo((42 + machJitter * 1.5) * progress, 0);
  ctx.lineTo((36 + machJitter * 1.5) * progress, 3.2 * progress);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 7. White-Hot Incandescent Core Diamond at Muzzle Mouth
  ctx.fillStyle = `rgba(255, 255, 255, ${1.0 * alpha})`;
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(5 * progress, -6.0 * progress);
  ctx.lineTo(18 * progress, 0);
  ctx.lineTo(5 * progress, 6.0 * progress);
  ctx.closePath();
  ctx.fill();

  // 8. High-Speed Incandescent Powder Sparks & Embers (Actively streaming forward along muzzle cone)
  for (let s = 0; s < 8; s++) {
    const sPhase = ((now * 0.095 + s * 14.5 + (spinAngle || 0) * 18.0) % 55);
    const sDist = (8 + sPhase * 1.15) * scale;
    const sSpread = (0.08 + (sPhase / 55) * 0.32);
    const sAngle = Math.sin(s * 3.1 + sPhase * 0.18) * sSpread;
    const sAlpha = Math.max(0, 1.0 - sPhase / 55) * alpha;
    const sSize = (1.4 + (s % 3) * 0.6) * (1.0 - sPhase / 70) * scale;
    const spX = Math.cos(sAngle) * sDist;
    const spY = Math.sin(sAngle) * sDist;

    ctx.fillStyle = `rgba(254, 240, 138, ${sAlpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(spX, spY, Math.max(0.6, sSize), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

let _cachedMinigunTrailGrad = null;

function _getMinigunTrailGrad(ctx) {
  if (!_cachedMinigunTrailGrad) {
    _cachedMinigunTrailGrad = ctx.createLinearGradient(-38, 0, 14, 0);
    _cachedMinigunTrailGrad.addColorStop(0, 'rgba(234, 88, 12, 0)');
    _cachedMinigunTrailGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.65)');
    _cachedMinigunTrailGrad.addColorStop(0.75, 'rgba(251, 191, 36, 0.95)');
    _cachedMinigunTrailGrad.addColorStop(1.0, 'rgba(255, 255, 255, 1.0)');
  }
  return _cachedMinigunTrailGrad;
}

/**
 * Draws CJ's M134 Minigun Armor-Piercing Supersonic Tracer Bullet in authentic Pixel Art Style (Saitama Tech)
 */
export function drawCjPixelMinigunBullet(ctx, p) {
  const vx = (p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined) ? p._resumeVx : (p.vx || 0);
  const vy = (p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined) ? p._resumeVy : (p.vy || 0);
  const angle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : (p.lastAngle !== undefined ? p.lastAngle : (p.angle || 0));
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // 1. Stepped Pixel World Tracer Trail
  if (p.history && p.history.length > 1) {
    ctx.save();
    for (let i = 0; i < p.history.length; i++) {
      const h = p.history[i];
      const alpha = (i / p.history.length) * 0.95;
      const size = (i > p.history.length - 4) ? 5.0 : 3.0;
      ctx.fillStyle = (i % 2 === 0) ? `rgba(249, 115, 22, ${alpha})` : `rgba(254, 240, 138, ${alpha})`;
      ctx.fillRect(snap(h.x - size * 0.5), snap(h.y - size * 0.5), size, size);
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(snap(p.x), snap(p.y));
  ctx.rotate(angle);

  // 2. Supersonic Stepped Pixel Shockwave Chevrons
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillRect(-10, -6, 2, 2);
  ctx.fillRect(-8, -4, 2, 2);
  ctx.fillRect(-6, -2, 2, 2);
  ctx.fillRect(-6, 2, 2, 2);
  ctx.fillRect(-8, 4, 2, 2);
  ctx.fillRect(-10, 6, 2, 2);

  ctx.fillStyle = 'rgba(254, 240, 138, 0.50)';
  ctx.fillRect(-18, -8, 2, 2);
  ctx.fillRect(-16, -6, 2, 2);
  ctx.fillRect(-14, -4, 2, 2);
  ctx.fillRect(-14, 4, 2, 2);
  ctx.fillRect(-16, 6, 2, 2);
  ctx.fillRect(-18, 8, 2, 2);

  // 3. Heavy 20mm AP Bullet Slug with #0E0F14 Outline
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-10, -4, 21, 8);

  // Tungsten Hardened Core
  ctx.fillStyle = '#B45309';
  ctx.fillRect(-9, -3, 10, 6);
  ctx.fillStyle = '#F97316';
  ctx.fillRect(1, -3, 6, 6);
  ctx.fillStyle = '#FBBF24';
  ctx.fillRect(7, -2, 2, 4);
  ctx.fillRect(9, -1, 1, 2);

  // White-Hot Specular Center Line
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-5, -1, 10, 2);

  ctx.restore();
}

/**
 * Draws CJ's high-velocity supersonic Minigun armor-piercing projectile with Mach shockwave rings
 */
export function drawCjMinigunBullet(ctx, p) {
  if (_isDarkMode()) {
    drawCjPixelMinigunBullet(ctx, p);
    return;
  }

  const vx = (p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined) ? p._resumeVx : (p.vx || 0);
  const vy = (p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined) ? p._resumeVy : (p.vy || 0);
  const angle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : (p.lastAngle !== undefined ? p.lastAngle : (p.angle || 0));
  const len = 20;
  const width = 4.2;

  // 1. World-Space Tracer Trail
  if (p.history && p.history.length > 1) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p.history[0].x, p.history[0].y);
    for (let i = 1; i < p.history.length; i++) {
      ctx.lineTo(p.history[i].x, p.history[i].y);
    }
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.65)'; // Fiery orange outer tracer
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Hot-yellow intense tracer core
    const sliceCount = Math.max(1, p.history.length - 4);
    ctx.beginPath();
    ctx.moveTo(p.history[sliceCount - 1].x, p.history[sliceCount - 1].y);
    for (let i = sliceCount; i < p.history.length; i++) {
      ctx.lineTo(p.history[i].x, p.history[i].y);
    }
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.98)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // 2. Trailing Supersonic Speed Streak
  ctx.fillStyle = _getMinigunTrailGrad(ctx);
  ctx.beginPath();
  ctx.moveTo(4, -width * 0.5);
  ctx.lineTo(-38, 0);
  ctx.lineTo(4, width * 0.5);
  ctx.closePath();
  ctx.fill();

  // 3. Supersonic Mach Conical Shockwave Rings
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-10, -6.0);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-10, 6.0);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(254, 240, 138, 0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-20, -9.0);
  ctx.lineTo(-12, 0);
  ctx.lineTo(-20, 9.0);
  ctx.stroke();

  // 4. Armor-Piercing Tungsten Core & Brass Shell
  ctx.fillStyle = '#B45309'; // Heavy brass casing
  ctx.fillRect(-len * 0.5, -width * 0.5, len * 0.65, width);

  // Hardened steel penetrator tip
  ctx.fillStyle = '#F59E0B';
  ctx.beginPath();
  ctx.arc(len * 0.15, 0, width * 0.5, -Math.PI / 2, Math.PI / 2);
  ctx.fill();

  // White-hot center highlight
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-len * 0.25, -width * 0.2, len * 0.45, width * 0.4);

  ctx.restore();
}

