import { CONFIG } from '../../core/config.js';

// ─────────────────────────────────────────────
// DUBSTEP GUN — "BASS CANNON"
// ─────────────────────────────────────────────
// Redesigned from the Ranger's pistol into a massive dubstep-themed
// assault-rifle-sized weapon built to look like portable audio equipment.
// Front: Massive subwoofer speaker emitter
// Middle: DJ mixing board with faders, dials, screens
// Back: Tactical stock and pistol grip

const DUBSTEP_COLORS = {
  // Base materials
  gunmetalDark: '#1a1d21',
  gunmetalMid: '#2a2e33',
  gunmetalLight: '#3a3f47',
  brushedSilver: '#8a9099',
  matteBlack: '#111315',
  panelGrey: '#4a4f55',

  // Accents / Screens
  electricBlue: '#00aaff',
  cyan: '#00ffff',
  screenBg: '#061828',

  // Energy / Cables
  fieryOrange: '#ff6600',
  hotYellow: '#ffcc00',
  cableOrange: '#ff8800',
  cableYellow: '#ffdd44',

  // RGB strips
  rgbPink: '#ff1493',
  rgbGreen: '#00ff66',
  rgbBlue: '#00aaff',

  // Controls
  buttonRed: '#ff2233',
  buttonBlue: '#2255ff',
  faderCap: '#cccccc',
  faderTrack: '#1a1a1a',
  dialFace: '#333840',

  // Speaker
  speakerCone: '#1e1e22',
  speakerRing: '#666c74',
  speakerCenter: '#2a2a2e',

  outline: '#080808',
};

export function drawBlueAimbotGun(ctx, x, y, gunAngle, r, fighter) {
  const prevShadowColor = ctx.shadowColor;
  const prevShadowBlur = ctx.shadowBlur;
  const prevShadowOffsetX = ctx.shadowOffsetX;
  const prevShadowOffsetY = ctx.shadowOffsetY;
  const prevFillStyle = ctx.fillStyle;
  const prevStrokeStyle = ctx.strokeStyle;
  const prevLineWidth = ctx.lineWidth;

  ctx.translate(x, y);
  ctx.rotate(gunAngle);

  let scaleY = 1;
  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
    scaleY = -1;
  }

  const baseOffset = CONFIG.gun.baseOffset;
  ctx.translate(r + baseOffset, 0);

  // Scale factor
  const s = 0.55;
  const C = DUBSTEP_COLORS;
  const time = Date.now();
  const pulse = (Math.sin(time / 200) + 1) / 2;
  const fastPulse = (Math.sin(time / 100) + 1) / 2;

  // ─── RECOIL & MUSIC NOTES LOGIC ───
  let recoil = 0;
  if (fighter) {
    // Calculate recoil based on shoot cooldown
    if (fighter.shootCooldown > 0) {
      recoil = Math.max(0, fighter.shootCooldown / (fighter.shootCooldownMax || 1));
      recoil = Math.pow(recoil, 1.5); // non-linear curve for punchier kick
    }
    
    fighter._musicNotes = fighter._musicNotes || [];
    
    // Spawn notes exactly once per shot when recoil spikes
    if (recoil > 0.85 && !fighter._hasSpawnedNotes) {
      fighter._hasSpawnedNotes = true;
      
      // Spawn notes erupting from the equalizer
      for (let i = 0; i < 4; i++) {
        fighter._musicNotes.push({
          x: -10 + Math.random() * 40,
          y: -15 + Math.random() * 10,
          vx: (Math.random() - 0.5) * 5,
          vy: -4 - Math.random() * 5,
          life: 1.0,
          color: [C.rgbPink, C.rgbGreen, C.rgbBlue, C.hotYellow][Math.floor(Math.random() * 4)],
          note: ['♪', '♫', '♬'][Math.floor(Math.random() * 3)],
          rot: Math.random() * Math.PI * 2
        });
      }
    } else if (recoil < 0.3) {
      // Reset flag when recoil recovers
      fighter._hasSpawnedNotes = false;
    }
  }

  // Apply recoil translation to the entire gun
  ctx.translate(-recoil * 12 * s, 0);

  // Helper: draw polygon from point array
  const drawPoly = (pts, fill, stroke, lw) => {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const px = pts[i][0] * s;
      const py = pts[i][1] * s;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = (lw || 1.5) * s;
      ctx.stroke();
    }
  };

  // Helper: rounded rect
  const drawRoundRect = (rx, ry, rw, rh, rad, fill, stroke, lw) => {
    ctx.beginPath();
    ctx.roundRect(rx * s, ry * s, rw * s, rh * s, (rad || 0) * s);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = (lw || 1.5) * s;
      ctx.stroke();
    }
  };

  // Drop shadow for depth
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // ═══════════════════════════════════════════════
  // 1. STOCK (Back — Skeletonized Tactical)
  // ═══════════════════════════════════════════════
  // Main stock frame
  ctx.beginPath();
  // Outer contour (Clockwise)
  ctx.moveTo(-24 * s, -6 * s);
  ctx.lineTo(-50 * s, -6 * s);
  ctx.lineTo(-54 * s, -2 * s);
  ctx.lineTo(-54 * s, 24 * s);
  ctx.lineTo(-44 * s, 24 * s);
  ctx.lineTo(-24 * s, 10 * s);
  ctx.lineTo(-24 * s, -6 * s);
  // Inner hole (Counter-Clockwise for evenodd fill)
  ctx.moveTo(-46 * s, 0 * s);
  ctx.lineTo(-46 * s, 16 * s);
  ctx.lineTo(-40 * s, 16 * s);
  ctx.lineTo(-28 * s, 6 * s);
  ctx.lineTo(-28 * s, 0 * s);
  ctx.lineTo(-46 * s, 0 * s);
  
  ctx.fillStyle = C.gunmetalDark;
  ctx.fill('evenodd');
  ctx.strokeStyle = C.outline;
  ctx.lineWidth = 1.5 * s;
  ctx.stroke();

  // Adjustable cheek rest (top)
  drawPoly([
    [-48, -8],
    [-28, -8],
    [-26, -6],
    [-50, -6],
  ], C.panelGrey, C.outline);

  // Rubber recoil pad (back)
  drawPoly([
    [-54, -3],
    [-58, -1],
    [-58, 23],
    [-54, 25],
  ], '#222529', C.outline);

  // Small glowing orange detail on the lower stock arm
  drawRoundRect(-44, 18, 5, 2, 0.5, C.fieryOrange, C.outline, 0.8);

  // ═══════════════════════════════════════════════
  // 2. PISTOL GRIP & TRIGGER
  // ═══════════════════════════════════════════════
  // Grip body
  drawPoly([
    [-10, 4],
    [-6, 4],
    [-4, 6],
    [-3, 18],
    [-5, 22],
    [-9, 24],
    [-13, 22],
    [-15, 18],
    [-14, 6],
  ], C.matteBlack, C.outline);

  // Finger grooves on grip
  ctx.strokeStyle = '#222528';
  ctx.lineWidth = 0.8 * s;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-14 * s, (9 + i * 3) * s);
    ctx.lineTo(-4 * s, (9 + i * 3) * s);
    ctx.stroke();
  }

  // Trigger guard
  ctx.strokeStyle = C.outline;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.moveTo(-4 * s, 4 * s);
  ctx.lineTo(2 * s, 4 * s);
  ctx.lineTo(2 * s, 12 * s);
  ctx.lineTo(-4 * s, 12 * s);
  ctx.stroke();

  // Trigger
  ctx.fillStyle = C.panelGrey;
  ctx.beginPath();
  ctx.moveTo(-2 * s, 5 * s);
  ctx.lineTo(0 * s, 8 * s);
  ctx.lineTo(-2 * s, 10 * s);
  ctx.closePath();
  ctx.fill();

  // ═══════════════════════════════════════════════
  // 3. MID-BODY — THE MIXING BOARD CHASSIS
  // ═══════════════════════════════════════════════
  // Main blocky body
  drawPoly([
    [-22, -10],
    [50, -10],
    [52, -8],
    [52, 6],
    [50, 8],
    [-22, 8],
    [-24, 6],
    [-24, -8],
  ], C.gunmetalLight, C.outline);

  // Upper panel section (lighter metallic)
  drawRoundRect(-22, -10, 72, 6, 0, C.brushedSilver, C.outline, 1);

  // Panel line segments (horizontal)
  ctx.strokeStyle = '#555a60';
  ctx.lineWidth = 0.5 * s;
  ctx.beginPath();
  ctx.moveTo(-20 * s, -2 * s);
  ctx.lineTo(48 * s, -2 * s);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-20 * s, 2 * s);
  ctx.lineTo(48 * s, 2 * s);
  ctx.stroke();

  // Vertical panel segments
  for (let px = -10; px <= 40; px += 12) {
    ctx.beginPath();
    ctx.moveTo(px * s, -10 * s);
    ctx.lineTo(px * s, 8 * s);
    ctx.stroke();
  }

  // ─── "BASS CANNON" Text ───
  ctx.fillStyle = C.brushedSilver;
  ctx.font = `bold ${4.5 * s}px monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('BASS', -18 * s, -7 * s);
  ctx.fillText('CANNON', -3 * s, -7 * s);

  // ─── Equalizer Sliders (Faders) ───
  const faderStartX = 6;
  for (let i = 0; i < 5; i++) {
    const fx = faderStartX + i * 7;
    const faderVal = Math.sin(time / 300 + i * 1.2) * 0.5 + 0.5; // animated

    // Track
    drawRoundRect(fx, -3, 2, 9, 0.5, C.faderTrack, '#333', 0.8);

    // Fader cap (slides up and down)
    const capY = -2 + faderVal * 6;
    drawRoundRect(fx - 0.5, capY, 3, 2, 0.5, C.faderCap, '#999', 0.8);
  }

  // ─── Volume Dials ───
  for (let i = 0; i < 2; i++) {
    const dx = -16 + i * 9;
    const dy = 1;
    // Dial body
    ctx.fillStyle = C.dialFace;
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.arc(dx * s, dy * s, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Dial indicator notch
    const notchAngle = -Math.PI / 4 + i * 0.8;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.6 * s;
    ctx.beginPath();
    ctx.moveTo((dx + Math.cos(notchAngle) * 0.8) * s, (dy + Math.sin(notchAngle) * 0.8) * s);
    ctx.lineTo((dx + Math.cos(notchAngle) * 2.2) * s, (dy + Math.sin(notchAngle) * 2.2) * s);
    ctx.stroke();
  }

  // ─── Small Buttons (Red & Blue) ───
  const btnData = [
    { x: -18, y: 5, color: C.buttonRed },
    { x: -14, y: 5, color: C.buttonBlue },
    { x: -10, y: 5, color: C.buttonRed },
    { x: -6, y: 5, color: C.buttonBlue },
  ];
  for (const btn of btnData) {
    drawRoundRect(btn.x, btn.y, 2.5, 1.8, 0.5, btn.color, '#111', 0.8);
  }

  // ═══════════════════════════════════════════════
  // 4. RGB LED STRIPS
  // ═══════════════════════════════════════════════
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Bottom edge LED strip
  const ledColors = [C.rgbPink, C.rgbGreen, C.rgbBlue, C.rgbPink, C.rgbGreen, C.rgbBlue,
    C.rgbPink, C.rgbGreen, C.rgbBlue, C.rgbPink, C.rgbGreen, C.rgbBlue];
  for (let i = 0; i < 12; i++) {
    const lx = -18 + i * 5.5;
    const ledPulse = (Math.sin(time / 150 + i * 0.5) + 1) / 2;
    const alpha = 0.5 + 0.5 * ledPulse;
    ctx.fillStyle = ledColors[i % ledColors.length];
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(lx * s, 7 * s, 1.0 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Top strip (above faders)
  for (let i = 0; i < 10; i++) {
    const lx = -16 + i * 6.5;
    const ledPulse = (Math.sin(time / 120 + i * 0.7 + 2) + 1) / 2;
    const alpha = 0.4 + 0.6 * ledPulse;
    ctx.fillStyle = ledColors[(i + 1) % ledColors.length];
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(lx * s, -4.5 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Restore shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowOffsetY = 2;

  // ═══════════════════════════════════════════════
  // 5. MAIN DISPLAY SCREEN (Waveform)
  // ═══════════════════════════════════════════════
  // Screen background
  drawRoundRect(4, -9, 24, 5, 1, C.screenBg, '#00aaff', 1);

  // Animated jagged audio waveform
  ctx.save();
  ctx.beginPath();
  ctx.rect(5 * s, -8.5 * s, 22 * s, 4 * s);
  ctx.clip();

  ctx.strokeStyle = C.electricBlue;
  ctx.lineWidth = 0.8 * s;
  ctx.beginPath();
  const waveY = -6.5;
  for (let wx = 5; wx < 27; wx += 1) {
    const waveVal = Math.sin((wx + time / 50) * 1.5) * 1.5 +
      Math.sin((wx + time / 30) * 3) * 0.6 +
      Math.cos((wx + time / 80) * 0.8) * 0.8;
    if (wx === 5) ctx.moveTo(wx * s, (waveY + waveVal) * s);
    else ctx.lineTo(wx * s, (waveY + waveVal) * s);
  }
  ctx.stroke();

  // Second waveform line (fainter)
  ctx.strokeStyle = `rgba(0, 255, 255, 0.3)`;
  ctx.lineWidth = 0.5 * s;
  ctx.beginPath();
  for (let wx = 5; wx < 27; wx += 1) {
    const waveVal = Math.cos((wx + time / 40) * 2) * 1.2 +
      Math.sin((wx + time / 60) * 1.8) * 0.5;
    if (wx === 5) ctx.moveTo(wx * s, (waveY + waveVal) * s);
    else ctx.lineTo(wx * s, (waveY + waveVal) * s);
  }
  ctx.stroke();
  ctx.restore();

  // Status lights around screen
  const statusColors = ['#00ff00', '#ffcc00', '#00aaff', '#ff3333'];
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = statusColors[i];
    ctx.globalAlpha = 0.6 + 0.4 * ((Math.sin(time / 200 + i) + 1) / 2);
    ctx.beginPath();
    ctx.arc((29 * s), (-8 + i * 1.5) * s, 0.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ═══════════════════════════════════════════════
  // 6. MAGAZINE — LED Volume Meter
  // ═══════════════════════════════════════════════
  // Magazine body
  drawPoly([
    [2, 8],
    [12, 8],
    [14, 10],
    [14, 28],
    [12, 30],
    [2, 30],
    [0, 28],
    [0, 10],
  ], C.gunmetalMid, C.outline);

  // LED volume meter (vertical bars)
  const meterColors = ['#00ff00', '#00ff00', '#44ff00', '#88ff00', '#ccff00', '#ffff00',
    '#ffcc00', '#ff8800', '#ff4400', '#ff0000'];
  
  ctx.shadowOffsetY = 0;
  for (let i = 0; i < 10; i++) {
    const my = 27 - i * 1.8;
    const meterPulse = (Math.sin(time / 180 + i * 0.4) + 1) / 2;
    const threshold = 0.3 + 0.7 * ((Math.sin(time / 250) + 1) / 2);
    const isLit = (i / 10) < threshold;

    ctx.fillStyle = isLit ? meterColors[i] : '#1a1a1a';
    ctx.globalAlpha = isLit ? (0.7 + 0.3 * meterPulse) : 0.3;
    
    // Add strong neon glow when the LED is lit
    if (isLit) {
      ctx.shadowColor = meterColors[i];
      ctx.shadowBlur = 12;
    } else {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    ctx.roundRect(3 * s, my * s, 8 * s, 1.2 * s, 0.3 * s);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Glass panel overlay on magazine
  ctx.fillStyle = 'rgba(100, 200, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(2 * s, 9 * s, 10 * s, 20 * s, 1 * s);
  ctx.fill();
  ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
  ctx.lineWidth = 0.5 * s;
  ctx.stroke();

  // "WUB WUB WUB" text at mag well
  ctx.fillStyle = C.rgbPink;
  ctx.shadowColor = C.rgbPink;
  ctx.shadowBlur = 8; // Text glow
  ctx.globalAlpha = 0.7 + 0.3 * pulse;
  ctx.font = `bold ${2.8 * s}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WUB WUB', 7 * s, 8.5 * s);
  ctx.fillText('WUB', 7 * s, 31 * s);
  
  // Restore normal shadow for the next elements
  ctx.globalAlpha = 1;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 2;

  // ─── Cooling Vents (horizontal slits in front of mag well) ───
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 0.6 * s;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(15 * s, (10 + i * 2.5) * s);
    ctx.lineTo(22 * s, (10 + i * 2.5) * s);
    ctx.stroke();
  }

  // ═══════════════════════════════════════════════
  // 7. BARREL — THE SUBWOOFER EMITTER
  // ═══════════════════════════════════════════════
  // Barrel housing (cylindrical look with rect approximation)
  drawPoly([
    [50, -12],
    [80, -14],
    [84, -12],
    [84, 10],
    [80, 12],
    [50, 10],
  ], C.gunmetalDark, C.outline);

  // Main Subwoofer Speaker — large recessed cone
  // Outer metallic ring
  ctx.fillStyle = C.speakerRing;
  ctx.strokeStyle = C.outline;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.arc(80 * s, -1 * s, 12 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Speaker cone (dark) - bumps outward with recoil
  const bumpX = 80 + recoil * 8;
  const bumpR = 10 + recoil * 1.5;
  
  ctx.fillStyle = C.speakerCone;
  ctx.beginPath();
  ctx.arc(bumpX * s, -1 * s, bumpR * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cone ridges (concentric circles for texture)
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.4 * s;
  for (let i = 2; i <= 8; i += 2) {
    ctx.beginPath();
    ctx.arc(bumpX * s, -1 * s, (i + recoil * 0.5) * s, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Speaker dust cap (center)
  ctx.fillStyle = C.speakerCenter;
  ctx.beginPath();
  ctx.arc(bumpX * s, -1 * s, (3 + recoil * 0.5) * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 0.5 * s;
  ctx.stroke();

  // Muzzle shockwave when shooting
  if (recoil > 0.1) {
    ctx.shadowColor = C.cyan;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = `rgba(0, 255, 255, ${recoil})`;
    ctx.lineWidth = (2 + recoil * 3) * s;
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.arc((bumpX + 5 + i * 8 + (1 - recoil) * 15) * s, -1 * s, (12 + i * 5 + (1 - recoil) * 10) * s, -Math.PI / 2.2, Math.PI / 2.2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // ─── Lower Speaker Box (Tweeters) ───
  drawRoundRect(58, 10, 22, 8, 1, C.gunmetalDark, C.outline);

  // Two small tweeter speakers
  for (let i = 0; i < 2; i++) {
    const tx = 63 + i * 12;
    const ty = 14;
    // Tweeter ring
    ctx.fillStyle = C.speakerRing;
    ctx.beginPath();
    ctx.arc(tx * s, ty * s, 3 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.outline;
    ctx.lineWidth = 1 * s;
    ctx.stroke();
    // Tweeter cone
    ctx.fillStyle = C.speakerCone;
    ctx.beginPath();
    ctx.arc(tx * s, ty * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    // Tweeter center
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(tx * s, ty * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // ═══════════════════════════════════════════════
  // 8. EXPOSED WIRING / CABLES
  // ═══════════════════════════════════════════════
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Orange cable: from tweeter box → looping under barrel → back into chassis
  ctx.strokeStyle = C.cableOrange;
  ctx.lineWidth = 1.5 * s;
  ctx.globalAlpha = 0.85 + 0.15 * pulse;
  ctx.beginPath();
  ctx.moveTo(58 * s, 14 * s);
  ctx.quadraticCurveTo(50 * s, 22 * s, 40 * s, 16 * s);
  ctx.quadraticCurveTo(30 * s, 12 * s, 20 * s, 8 * s);
  ctx.stroke();

  // Yellow cable
  ctx.strokeStyle = C.cableYellow;
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(60 * s, 16 * s);
  ctx.quadraticCurveTo(52 * s, 24 * s, 42 * s, 18 * s);
  ctx.quadraticCurveTo(34 * s, 14 * s, 24 * s, 8 * s);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Cable connection nodes (small bright dots)
  const cableNodes = [[58, 14], [40, 16], [20, 8], [60, 16], [42, 18], [24, 8]];
  for (const [nx, ny] of cableNodes) {
    ctx.fillStyle = C.cableOrange;
    ctx.beginPath();
    ctx.arc(nx * s, ny * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // ═══════════════════════════════════════════════
  // 9. TOP SOUNDBAR SCOPE
  // ═══════════════════════════════════════════════
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowOffsetY = 2;

  // Top rail
  drawRoundRect(-10, -12, 50, 2, 0, C.gunmetalMid, C.outline, 0.8);

  // Soundbar body
  drawRoundRect(0, -18, 35, 6, 1, C.gunmetalDark, C.outline);

  // Small speaker cones on the side of soundbar
  for (let i = 0; i < 3; i++) {
    const sx = 5 + i * 11;
    const sy = -15;
    ctx.fillStyle = C.speakerRing;
    ctx.beginPath();
    ctx.arc(sx * s, sy * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.outline;
    ctx.lineWidth = 0.7 * s;
    ctx.stroke();
    ctx.fillStyle = C.speakerCone;
    ctx.beginPath();
    ctx.arc(sx * s, sy * s, 1.3 * s, 0, Math.PI * 2);
    ctx.fill();
    // Animated speaker pulse
    ctx.strokeStyle = `rgba(0, 170, 255, ${0.2 + 0.3 * fastPulse})`;
    ctx.lineWidth = 0.4 * s;
    ctx.beginPath();
    ctx.arc(sx * s, sy * s, (2.5 + fastPulse) * s, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ═══════════════════════════════════════════════
  // 10. ENERGY EFFECTS (Animated)
  // ═══════════════════════════════════════════════
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // ─── Glowing Orange Energy Ring around subwoofer ───
  const ringAlpha = 0.4 + 0.6 * pulse;
  ctx.strokeStyle = `rgba(255, 102, 0, ${ringAlpha})`;
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.arc(80 * s, -1 * s, (13 + pulse * 1.5) * s, 0, Math.PI * 2);
  ctx.stroke();

  // Second outer ring (fainter)
  ctx.strokeStyle = `rgba(255, 170, 0, ${ringAlpha * 0.5})`;
  ctx.lineWidth = 0.8 * s;
  ctx.beginPath();
  ctx.arc(80 * s, -1 * s, (15 + pulse * 2) * s, 0, Math.PI * 2);
  ctx.stroke();

  // ─── Lightning Bolts from subwoofer center ───
  ctx.strokeStyle = `rgba(0, 200, 255, ${0.5 + 0.5 * fastPulse})`;
  ctx.lineWidth = 0.8 * s;

  // Bolt 1
  ctx.beginPath();
  ctx.moveTo(84 * s, -1 * s);
  ctx.lineTo(90 * s, -4 * s);
  ctx.lineTo(88 * s, -2 * s);
  ctx.lineTo(95 * s, -6 * s);
  ctx.stroke();

  // Bolt 2
  ctx.beginPath();
  ctx.moveTo(84 * s, 0 * s);
  ctx.lineTo(91 * s, 3 * s);
  ctx.lineTo(89 * s, 1 * s);
  ctx.lineTo(96 * s, 4 * s);
  ctx.stroke();

  // Bolt 3 (lower)
  ctx.strokeStyle = `rgba(255, 200, 0, ${0.3 + 0.5 * pulse})`;
  ctx.beginPath();
  ctx.moveTo(84 * s, -3 * s);
  ctx.lineTo(92 * s, -8 * s);
  ctx.lineTo(90 * s, -5 * s);
  ctx.lineTo(98 * s, -10 * s);
  ctx.stroke();

  // ─── Soundwave Lines (concentric arcs blasting out) ───
  for (let i = 0; i < 3; i++) {
    const waveOffset = 86 + i * 6 + pulse * 3;
    const waveAlpha = 0.5 - i * 0.15;
    const waveSize = (5 - i) * s;

    ctx.strokeStyle = `rgba(0, 170, 255, ${waveAlpha})`;
    ctx.lineWidth = (1.2 - i * 0.3) * s;
    ctx.beginPath();
    ctx.arc(waveOffset * s, -1 * s, waveSize, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
  }

  // ═══════════════════════════════════════════════
  // 11. FLOATING MUSIC NOTES
  // ═══════════════════════════════════════════════
  if (fighter && fighter._musicNotes && fighter._musicNotes.length > 0) {
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    for (let i = fighter._musicNotes.length - 1; i >= 0; i--) {
      const note = fighter._musicNotes[i];
      
      // Update physics
      note.x += note.vx;
      note.y += note.vy;
      note.vx *= 0.92; // friction
      note.vy *= 0.92;
      note.rot += note.vx * 0.05;
      note.life -= 0.008; // extremely smooth and slow fade out
      
      if (note.life <= 0) {
        fighter._musicNotes.splice(i, 1);
        continue;
      }
      
      // Draw note
      ctx.save();
      ctx.translate(note.x * s, note.y * s);
      ctx.rotate(note.rot);
      ctx.fillStyle = note.color;
      ctx.shadowColor = note.color;
      ctx.shadowBlur = 6;
      ctx.globalAlpha = Math.max(0, Math.min(1, note.life)); // smooth linear fade
      ctx.font = `bold ${28 * s}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(note.note, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // ═══════════════════════════════════════════════
  // CLEANUP — Reverse transforms
  // ═══════════════════════════════════════════════
  ctx.translate(recoil * 12 * s, 0); // Reverse recoil kick
  ctx.translate(-(r + baseOffset), 0);
  if (scaleY === -1) {
    ctx.scale(1, -1);
  }
  ctx.rotate(-gunAngle);
  ctx.translate(-x, -y);

  // Restore context state
  ctx.shadowColor = prevShadowColor;
  ctx.shadowBlur = prevShadowBlur;
  ctx.shadowOffsetX = prevShadowOffsetX;
  ctx.shadowOffsetY = prevShadowOffsetY;
  ctx.fillStyle = prevFillStyle;
  ctx.strokeStyle = prevStrokeStyle;
  ctx.lineWidth = prevLineWidth;
}

// ─────────────────────────────────────────────
// DUBSTEP SHOCKWAVE PROJECTILE
// ─────────────────────────────────────────────
// A colorful, expanding soundwave/shockwave that pulses outward
// with rainbow concentric arcs, vibrant ripple trail, and
// bass distortion rings — like visible sound tearing through air.

// Rainbow color palette for the shockwave rings
const WAVE_COLORS = [
  '#ff1493', // hot pink
  '#ff4400', // red-orange
  '#ff8800', // orange
  '#ffcc00', // yellow
  '#00ff66', // green
  '#00ccff', // cyan
  '#4488ff', // blue
  '#8844ff', // purple
  '#ff1493', // back to pink (loop)
];

/**
 * Draws a colorful soundwave/shockwave projectile with
 * expanding rainbow arcs and a vibrant ripple trail.
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Object} p - The projectile object
 */
export function drawRangerBullet(ctx, p) {
  const prevShadowColor = ctx.shadowColor;
  const prevShadowBlur = ctx.shadowBlur;
  const prevFillStyle = ctx.fillStyle;
  const prevStrokeStyle = ctx.strokeStyle;
  const prevLineWidth = ctx.lineWidth;
  const prevGlobalAlpha = ctx.globalAlpha;
  const prevCompositeOperation = ctx.globalCompositeOperation;

  const vx = p.vx === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  const time = Date.now();
  const pulse = (Math.sin(time / 100) + 1) / 2;
  const fastPulse = (Math.sin(time / 60) + 1) / 2;

  // ═══════════════════════════════════════════════
  // EXPANDING SHOCKWAVE ARCS (Main effect)
  // ═══════════════════════════════════════════════
  // Multiple concentric rainbow-colored arcs expanding outward from center
  ctx.save();
  for (let i = 0; i < 6; i++) {
    const ringPhase = (time / 150 + i * 0.8) % (Math.PI * 2);
    const expandScale = 0.5 + (Math.sin(ringPhase) + 1) / 2 * 1.5; // pulsing 0.5→2.0
    const ringRadius = p.r * (1.2 + i * 0.7) * expandScale;
    const alpha = 0.65 - i * 0.08;

    // Each ring gets a different rainbow color, cycling over time
    const colorIdx = (i + Math.floor(time / 120)) % WAVE_COLORS.length;
    ctx.strokeStyle = WAVE_COLORS[colorIdx];
    ctx.globalAlpha = Math.max(0.05, alpha);
    ctx.lineWidth = 2.2 - i * 0.25;
    if (ctx.lineWidth < 0.5) ctx.lineWidth = 0.5;

    // Draw forward-facing arc (wider spread for outer rings)
    const spread = Math.PI / 3 + i * 0.12;
    ctx.beginPath();
    ctx.arc(p.x, p.y, ringRadius, angle - spread, angle + spread);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // Restore context state
  ctx.shadowColor = prevShadowColor;
  ctx.shadowBlur = prevShadowBlur;
  ctx.fillStyle = prevFillStyle;
  ctx.strokeStyle = prevStrokeStyle;
  ctx.lineWidth = prevLineWidth;
  ctx.globalAlpha = prevGlobalAlpha;
  ctx.globalCompositeOperation = prevCompositeOperation;
}
