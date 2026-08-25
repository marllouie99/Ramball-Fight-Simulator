export function drawBleedEffect(ctx, baseRadius, timer = 180, fighter = null) {
  ctx.save();
  const t = Date.now();
  const pulse = Math.sin(t * 0.012) * 0.5 + 0.5;

  // 1. Crimson wound pulse glow on body
  ctx.fillStyle = `rgba(180, 0, 0, ${0.18 + 0.14 * pulse})`;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  // 2. Puncture bleeding cuts across body
  ctx.strokeStyle = 'rgba(220, 20, 20, 0.85)';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-baseRadius * 0.35, -baseRadius * 0.20);
  ctx.lineTo(-baseRadius * 0.15, baseRadius * 0.30);
  ctx.moveTo(baseRadius * 0.20, -baseRadius * 0.30);
  ctx.lineTo(baseRadius * 0.35, baseRadius * 0.15);
  ctx.stroke();

  // 3. Floating Bleed Droplet Icon on top of the model (with gentle floating bob)
  // Counteract fighter body rotation and vertical flipping so the status icon stays strictly upright above the head in world space
  ctx.save();
  if (typeof ctx.getTransform === 'function') {
    const m = ctx.getTransform();
    const currentAngle = Math.atan2(m.b, m.a);
    const isFlipped = (m.a * m.d - m.b * m.c) < 0;
    if (isFlipped) {
      ctx.scale(1, -1);
    }
    ctx.rotate(-currentAngle);
  } else if (fighter) {
    const hasGunAngleSkin = Boolean(fighter.characterId && (fighter.characterId === 'john_wick' || fighter.characterId === 'toji' || fighter.characterId === 'megumi' || fighter.characterId === 'gojo' || fighter.characterId === 'sukuna' || fighter.characterId === 'yuta' || fighter.characterId === 'mahito' || fighter.characterId === 'mahoraga' || fighter.characterId === 'saitama' || fighter.characterId === 'nanami' || fighter.characterId === 'nobara' || fighter.characterId === 'yuji' || fighter.characterId === 'todo' || fighter.characterId === 'ichigo' || fighter.characterId === 'genos' || fighter.characterId === 'layla' || fighter.characterId === 'ruby' || fighter.characterId === 'cronos' || fighter.characterId === 'darkslategray'));
    const appliedAngle = fighter._isWinnerReveal ? 0 : (hasGunAngleSkin ? (fighter.gunAngle || 0) : (fighter.angle !== undefined ? fighter.angle : (fighter.gunAngle || 0)));
    const facingLeft = Math.abs(appliedAngle) > Math.PI / 2;
    if (facingLeft && !fighter.isSpinning) {
      ctx.scale(1, -1);
    }
    ctx.rotate(-appliedAngle);
  }

  const bobY = Math.sin(t / 160) * 2.5;
  const iconY = -baseRadius - 26 + bobY;
  ctx.translate(0, iconY);

  const iconPulse = 1.0 + Math.sin(t / 200) * 0.04;
  ctx.scale(iconPulse, iconPulse);

  // Subtle dark outline/shadow behind icon for high contrast visibility on any background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.arc(0, 3, 10, 0, Math.PI * 2);
  ctx.fill();

  // Deep Crimson Stylized Droplet Body with dripping tails
  ctx.fillStyle = '#C81E1E';
  ctx.beginPath();
  // Top pointed tip
  ctx.moveTo(0, -13);
  // Right bulb curve
  ctx.bezierCurveTo(7.5, -4, 9.5, 3, 6.5, 7.5);
  // Right drip
  ctx.bezierCurveTo(4.2, 9.2, 3.2, 11.5, 3.2, 13);
  ctx.arc(2.5, 13.5, 0.8, 0, Math.PI);
  // Center long dripping stream
  ctx.bezierCurveTo(2.2, 10, 1.2, 11, 1.2, 16.5);
  ctx.arc(0, 17, 1.3, 0, Math.PI);
  ctx.bezierCurveTo(-1.2, 11, -2.2, 10, -2.5, 13.5);
  // Left drip
  ctx.arc(-3.2, 13, 0.8, 0, Math.PI);
  // Left bulb curve
  ctx.bezierCurveTo(-3.2, 11.5, -4.2, 9.2, -6.5, 7.5);
  ctx.bezierCurveTo(-9.5, 3, -7.5, -4, 0, -13);
  ctx.closePath();
  ctx.fill();

  // Extra detached dripping beads below
  ctx.beginPath();
  ctx.arc(0, 20.5, 1.0, 0, Math.PI * 2);
  ctx.arc(-2.8, 17.5, 0.75, 0, Math.PI * 2);
  ctx.arc(2.8, 18.5, 0.75, 0, Math.PI * 2);
  ctx.fill();

  // Curved Pure White Gloss Highlight (Right shoulder)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.beginPath();
  ctx.moveTo(1.8, -7.5);
  ctx.bezierCurveTo(5.8, -1.5, 6.8, 3.5, 4.2, 6.8);
  ctx.bezierCurveTo(5.6, 4.2, 4.8, -1.0, 1.8, -7.5);
  ctx.closePath();
  ctx.fill();

  // Subtle curved rim highlight (Left lower bulb)
  ctx.beginPath();
  ctx.moveTo(-5.2, 1.8);
  ctx.bezierCurveTo(-6.5, 4.8, -4.8, 7.2, -2.2, 7.8);
  ctx.bezierCurveTo(-3.8, 7.0, -5.4, 5.0, -5.2, 1.8);
  ctx.closePath();
  ctx.fill();

  ctx.restore(); // Undo icon transform

  ctx.restore();
}

export function drawSlowEffect(ctx, baseRadius) {
  // A subtle dark blue aura with descending rings indicating "weighed down"
  ctx.fillStyle = 'rgba(40, 60, 100, 0.4)';
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();
  
  const time = Date.now();
  ctx.strokeStyle = 'rgba(100, 150, 255, 0.7)';
  ctx.lineWidth = 2;
  const numRings = 3;
  for (let i = 0; i < numRings; i++) {
    const p = ((time / 1000) + (i / numRings)) % 1; // 0 to 1 over 1 second
    const yOffset = (p * 2 - 1) * baseRadius; // Moves from top (-radius) to bottom (+radius)
    // Calculate radius of the ring at this yOffset to wrap around the sphere
    const ringRadius = Math.sqrt(Math.max(0, baseRadius * baseRadius - yOffset * yOffset)) + 4; 
    
    ctx.beginPath();
    ctx.ellipse(0, yOffset, ringRadius, ringRadius * 0.35, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawElectricStunEffect(ctx, baseRadius, useAggressiveMode) {
  ctx.save();
  
  // Clean electric gold pulse on the body
  ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  // OPTIMIZATION: Skip shockwaves on low-end machines
  if (!useAggressiveMode) {
    // Expanding golden electricity shockwaves
    const timeFactor1 = (Date.now() % 200) / 200; // Loops every 200ms
    const timeFactor2 = ((Date.now() + 100) % 200) / 200; // Offset by 100ms
    
    // Inner thicker shockwave
    ctx.strokeStyle = `rgba(255, 235, 120, ${1 - timeFactor1})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * (1 + timeFactor1 * 1.5), 0, Math.PI * 2);
    ctx.stroke();

    // Outer thinner shockwave
    ctx.strokeStyle = `rgba(255, 215, 0, ${1 - timeFactor2})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * (1 + timeFactor2 * 2.5), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawDubstepStunEffect(ctx, baseRadius, timer = 45) {
  ctx.save();
  const t = Date.now();
  
  // Smoothly fade out as the visual timer approaches 0 (over 45 frames / ~0.75s)
  const fadeAlpha = Math.max(0, Math.min(1, timer / 45));
  
  // 1. Throbbing neon bass glow
  const pulse = (Math.sin(t / 80) + 1) / 2;
  const rgbColors = ['#ff1493', '#00ff66', '#00aaff', '#ffcc00'];
  const colorIdx = Math.floor(t / 150) % rgbColors.length;
  
  ctx.fillStyle = rgbColors[colorIdx];
  ctx.globalAlpha = (0.3 + 0.4 * pulse) * fadeAlpha;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius * (1.1 + pulse * 0.2), 0, Math.PI * 2);
  ctx.fill();

  // 2. Sonic distortion rings emanating from center (deafened effect)
  ctx.shadowBlur = 0;
  for (let i = 0; i < 2; i++) {
    const ringPhase = ((t / 250) + i * 0.5) % 1;
    ctx.strokeStyle = rgbColors[(colorIdx + i + 1) % rgbColors.length];
    ctx.globalAlpha = (1 - ringPhase) * 0.8 * fadeAlpha;
    ctx.lineWidth = 2 + ringPhase * 2;
    ctx.beginPath();
    // Use an ellipse to give it a 3D expanding sonic wave look
    ctx.ellipse(0, 0, baseRadius * (1 + ringPhase * 1.5), baseRadius * (0.8 + ringPhase * 1.2), 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 3. Spinning "dizzy" music notes around their head
  const numNotes = 3;
  const orbitRadius = baseRadius + 15;
  const speed = t / 350; // orbit speed
  ctx.font = `bold 24px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const notes = ['♪', '♫', '♬'];
  for (let i = 0; i < numNotes; i++) {
    const angle = speed + (i * Math.PI * 2 / numNotes);
    const nx = Math.cos(angle) * orbitRadius;
    const ny = Math.sin(angle) * orbitRadius * 0.5 - baseRadius - 10; // tilted orbit above head
    
    ctx.fillStyle = rgbColors[(colorIdx + i) % rgbColors.length];
    ctx.fillText(notes[i], nx, ny);
  }

  ctx.restore();
}

export function drawCrimsonElectrifiedEffect(ctx, baseRadius, isTrickster = false) {
  ctx.save();
  
  // 1. Dark crimson aura glow
  ctx.fillStyle = isTrickster ? `rgba(0, 100, 0, ${0.4 + 0.2 * Math.sin(Date.now() / 50)})` : `rgba(100, 0, 0, ${0.4 + 0.2 * Math.sin(Date.now() / 50)})`;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius * 1.2, 0, Math.PI * 2);
  ctx.fill();

  // 2. Crackling jagged lightning arcs wrapping the body
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Draw 3-4 random lightning arcs per frame
  const numArcs = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < numArcs; i++) {
    const angleStart = Math.random() * Math.PI * 2;
    const angleEnd = angleStart + (Math.random() > 0.5 ? 1 : -1) * (0.5 + Math.random());
    const isWhite = Math.random() > 0.6;
    
    if (isTrickster) {
      ctx.strokeStyle = isWhite ? 'rgba(255, 255, 255, 0.9)' : 'rgba(50, 255, 50, 0.9)';
    } else {
      ctx.strokeStyle = isWhite ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 50, 50, 0.9)';
    }
    ctx.beginPath();
    
    // Create jagged path along the perimeter
    const segments = 4 + Math.floor(Math.random() * 3);
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const angle = angleStart + (angleEnd - angleStart) * t;
      // Jitter the radius so it spikes in and out
      const r = baseRadius * (0.8 + Math.random() * 0.6);
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  
  ctx.restore();
}

export function drawPoisonEffect(ctx, baseRadius) {
  ctx.fillStyle = 'rgba(77, 255, 77, 0.4)';
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBurnEffect(ctx, baseRadius, useAggressiveMode) {
  // OPTIMIZATION: Simplified burn effect at low quality
  if (useAggressiveMode) {
    ctx.fillStyle = 'rgba(255, 100, 0, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // 1. Pulse heat glow outline
  const glowIntensity = Math.abs(Math.sin(Date.now() / 150));
  ctx.save();
  ctx.strokeStyle = `rgba(255, 120, 0, ${0.35 + glowIntensity * 0.25})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius + 1 + glowIntensity * 1.2, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Subtle translucent fiery inner aura
  ctx.fillStyle = `rgba(255, 50, 0, ${0.08 + glowIntensity * 0.06})`;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  // 3. Embers popping off the body
  ctx.fillStyle = 'rgba(255, 200, 0, 0.7)';
  for (let i = 0; i < 2; i++) {
    // Pseudo-random positions based on time to make them flicker/move
    const seed = (Date.now() / 80 + i * 13) % (Math.PI * 2);
    const rOffset = baseRadius * (0.6 + 0.4 * Math.sin(seed * 2));
    const x = Math.cos(seed) * rOffset;
    const y = Math.sin(seed) * rOffset;
    
    ctx.beginPath();
    ctx.arc(x, y, 1.2 + Math.sin(seed * 3) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawThunderRootsEffect(ctx, baseRadius) {
  ctx.save();
  
  // 1. Light blue aura glow (very faint)
  ctx.fillStyle = `rgba(0, 191, 255, ${0.1 + 0.05 * Math.sin(Date.now() / 40)})`;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius * 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Removed shadowBlur to fix massive FPS drops
  
  // Fast 3D traveling worms on the surface of a sphere
  const time = Date.now() / 150; 
  const numWorms = 3; // Reduced from 4 for performance
  
  for (let i = 0; i < numWorms; i++) {
     const segments = 8; // Reduced from 12 for performance
     let prevX = 0, prevY = 0;
     
     // Evaluate from tail (j=segments) to head (j=0)
     for (let j = segments; j >= 0; j--) {
        // Evaluate the continuous path function at a slightly delayed time to form the body
        const t = time - j * 0.08; 
        
        // Random continuous 3D path using Lissajous curves with different frequencies per worm
        const f1 = 1.3 + i * 0.5;
        const f2 = 1.7 + i * 0.7;
        const f3 = 2.1 + i * 0.3;
        
        let x = Math.sin(t * f1) + Math.cos(t * f2 * 0.8);
        let y = Math.sin(t * f2) + Math.cos(t * f3 * 1.1);
        let z = Math.sin(t * f3) + Math.cos(t * f1 * 0.9);
        
        // Normalize to force the worm onto the surface of the sphere
        const len = Math.sqrt(x*x + y*y + z*z) || 1;
        x /= len;
        y /= len;
        z /= len;
        
        // Add crackle (jaggedness) as a function of t so the tail exactly follows the head's jagged path!
        const crackleX = Math.sin(t * 35 + i * 100) * 0.15;
        const crackleY = Math.cos(t * 42 + i * 100) * 0.15;
        x += crackleX;
        y += crackleY;
        
        // Project to 2D
        const px = x * baseRadius * 0.95;
        const py = y * baseRadius * 0.95;
        
        if (j === segments) {
           prevX = px;
           prevY = py;
        } else {
           ctx.beginPath();
           ctx.moveTo(prevX, prevY);
           ctx.lineTo(px, py);
           
           const progress = 1 - (j / segments); // 0.0 at tail, 1.0 at head
           
           // If z < 0, the worm is on the BACK side of the 3D sphere. Draw it very faint!
           const zAlpha = z > 0 ? 1.0 : 0.15;
           const alpha = progress * zAlpha;
           
           const isWhite = i === 0 || i === 2;
           ctx.strokeStyle = isWhite ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 230, 255, ${alpha})`;
           ctx.lineWidth = 2.0 * progress;
           ctx.stroke();
           
           // Draw spark at the head if it's on the front of the sphere
           if (j === 0 && z > 0) {
              ctx.beginPath();
              ctx.arc(px, py, 1.5, 0, Math.PI*2);
              ctx.fillStyle = isWhite ? '#FFFFFF' : '#00FFFF';
              ctx.fill();
           }
           
           prevX = px;
           prevY = py;
        }
     }
  }

  // Outer 3D orbiting electricity (sparks flying around the body)
  const numOrbits = 2; // Reduced from 3 for performance
  for (let k = 0; k < numOrbits; k++) {
    const orbitTime = (Date.now() / 250) + k * 100;
    const orbitRadius = baseRadius * (1.3 + k * 0.3); // Further out than the worms
    
    let prevPx = 0, prevPy = 0;
    
    // Draw a short arc/spark
    const arcSegments = 6;
    for (let j = arcSegments; j >= 0; j--) {
        const t = orbitTime - j * 0.08;
        
        // Basic 3D circle
        let x = Math.cos(t);
        let y = Math.sin(t);
        let z = 0;
        
        // Tilt the orbital plane so they orbit in true 3D randomly
        const tiltX = k * 1.8 + 0.5;
        let tempY = y * Math.cos(tiltX) - z * Math.sin(tiltX);
        let tempZ = y * Math.sin(tiltX) + z * Math.cos(tiltX);
        y = tempY; z = tempZ;
        
        const tiltY = k * 2.3 + 1.2;
        let tempX = x * Math.cos(tiltY) - z * Math.sin(tiltY);
        tempZ = x * Math.sin(tiltY) + z * Math.cos(tiltY);
        x = tempX; z = tempZ;
        
        // Add a slight crackle
        const crackle = Math.sin(t * 30 + k * 50) * 0.08;
        
        const px = x * orbitRadius * (1 + crackle);
        const py = y * orbitRadius * (1 + crackle);
        
        if (j === arcSegments) {
           prevPx = px;
           prevPy = py;
        } else {
           ctx.beginPath();
           ctx.moveTo(prevPx, prevPy);
           ctx.lineTo(px, py);
           
           const progress = 1 - (j / arcSegments); 
           // If z < 0, it orbits BEHIND the target
           const zAlpha = z > 0 ? 0.9 : 0.05; 
           const alpha = progress * zAlpha;
           
           const isWhite = (k % 2 === 0);
           ctx.strokeStyle = isWhite ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 230, 255, ${alpha})`;
           ctx.lineWidth = 1.2 * progress;
           ctx.stroke();
           
           // Head spark
           if (j === 0 && z > 0) {
              ctx.beginPath();
              ctx.arc(px, py, 1.0, 0, Math.PI*2);
              ctx.fillStyle = isWhite ? '#FFFFFF' : '#00FFFF';
              ctx.fill();
           }
           
           prevPx = px;
           prevPy = py;
        }
    }
  }
  
  ctx.restore();
}

/**
 * Renders Silence debuff visual (Inverted Spear anti-technique lock).
 */
export function drawSilenceEffect(ctx, baseRadius) {
  ctx.save();
  const t = Date.now();
  const pulse = Math.sin(t / 100) * 0.12 + 0.65;

  // 1. Glowing Deep Purple Inner Body Overlay (Target body glows deep purple!)
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius * 1.15);
  grad.addColorStop(0, `rgba(200, 100, 255, ${pulse * 0.85})`); // Bright magenta-purple core
  grad.addColorStop(0.6, `rgba(130, 40, 210, ${pulse * 0.75})`); // Deep JJK cursed purple body
  grad.addColorStop(1.0, `rgba(70, 10, 120, 0.35)`);             // Outer purple fade

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius * 1.05, 0, Math.PI * 2);
  ctx.fill();

  // 2. Bright Purple Body Outline Glow Ring
  ctx.strokeStyle = `rgba(210, 120, 255, ${pulse})`;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius * 1.05, 0, Math.PI * 2);
  ctx.stroke();

  // 3. Anti-Technique Lock Ring (Purple-ash rotating dashed circle)
  ctx.strokeStyle = `rgba(230, 160, 255, ${pulse * 0.95})`;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius * 1.3, t / 150, t / 150 + Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]); // Prevent dashed line leak

  // 4. Silence Padlock Icon floating above target's head
  ctx.save();
  if (typeof ctx.getTransform === 'function') {
    const m = ctx.getTransform();
    const currentAngle = Math.atan2(m.b, m.a);
    const isFlipped = (m.a * m.d - m.b * m.c) < 0;
    if (isFlipped) {
      ctx.scale(1, -1);
    }
    ctx.rotate(-currentAngle);
  }

  const lockY = -baseRadius - 14;
  ctx.fillStyle = '#D8A0FF';
  ctx.strokeStyle = '#5A189A';
  ctx.lineWidth = 2;
  
  // Padlock body
  ctx.fillRect(-6, lockY - 5, 12, 10);
  ctx.strokeRect(-6, lockY - 5, 12, 10);
  // Padlock shackle
  ctx.beginPath();
  ctx.arc(0, lockY - 5, 4, Math.PI, 0);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
// BLACK FLASH DEBUFF — Static zero-allocation buffers & configuration
// ─────────────────────────────────────────────────────────────────────────────
const BF_DEBUFF_BANDS = [
  { rxMult: 1.62, ryMult: 0.72, tilt: 0.5, speed: 0.006, cosTilt: Math.cos(0.5), sinTilt: Math.sin(0.5) },
  { rxMult: 1.62, ryMult: 0.72, tilt: -0.6, speed: -0.007, cosTilt: Math.cos(-0.6), sinTilt: Math.sin(-0.6) },
  { rxMult: 1.50, ryMult: 0.85, tilt: 1.2, speed: 0.005, cosTilt: Math.cos(1.2), sinTilt: Math.sin(1.2) }
];
const _bfDebuffPtsX = new Float32Array(8);
const _bfDebuffPtsY = new Float32Array(8);
const _bfDebuffPtsOcc = new Uint8Array(8);

/**
 * Renders the snappy, 3D orbiting Black Flash visual debuff on the enemy.
 * High-performance implementation with pre-allocated coordinate buffers.
 */
export function drawBlackFlashDebuffEffect(ctx, baseRadius) {
  ctx.save();
  const t = Date.now();
  
  // High speed phase for stroboscopic crackle
  const pulse = Math.sin(t * 0.04) * 0.15 + 0.75;
  ctx.globalAlpha = pulse;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';

  const steps = 6;
  const hasPath2D = typeof Path2D !== 'undefined';
  const occThreshold = (baseRadius - 1.5) * (baseRadius - 1.5);

  for (let b = 0; b < 3; b++) {
    const band = BF_DEBUFF_BANDS[b];
    const rx = baseRadius * band.rxMult;
    const ry = baseRadius * band.ryMult;
    const baseAngle = t * band.speed + b * 2.1;
    const arcLen = 0.5 + Math.sin(t * 0.045 + b * 11) * 0.35;
    
    for (let i = 0; i <= steps; i++) {
      const theta = baseAngle + (i / steps) * arcLen;
      const x0 = rx * Math.cos(theta);
      const y0 = ry * Math.sin(theta);
      const z = Math.sin(theta);

      let jx = 0;
      let jy = 0;
      if (i > 0 && i < steps) {
        const displace = 4.5 + Math.random() * 5.5;
        jx = (Math.random() - 0.5) * displace;
        jy = (Math.random() - 0.5) * displace;
      }

      const xMod = x0 + jx;
      const yMod = y0 + jy;
      const rx_rot = xMod * band.cosTilt - yMod * band.sinTilt;
      const ry_rot = xMod * band.sinTilt + yMod * band.cosTilt;
      
      const distSq = rx_rot * rx_rot + ry_rot * ry_rot;
      _bfDebuffPtsX[i] = rx_rot;
      _bfDebuffPtsY[i] = ry_rot;
      _bfDebuffPtsOcc[i] = (z < 0 && distSq < occThreshold) ? 1 : 0;
    }

    if (hasPath2D) {
      const bandPath = new Path2D();
      let drawing = false;
      for (let i = 0; i <= steps; i++) {
        if (_bfDebuffPtsOcc[i] === 0) {
          if (!drawing) {
            bandPath.moveTo(_bfDebuffPtsX[i], _bfDebuffPtsY[i]);
            drawing = true;
          } else {
            bandPath.lineTo(_bfDebuffPtsX[i], _bfDebuffPtsY[i]);
          }
        } else {
          drawing = false;
        }
      }

      // Draw 3 layers with pre-compiled bandPath
      ctx.lineWidth = 3.0;
      ctx.strokeStyle = '#000000';
      ctx.stroke(bandPath);

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#B30000';
      ctx.stroke(bandPath);

      ctx.lineWidth = 0.65;
      ctx.strokeStyle = '#F3E8FF';
      ctx.stroke(bandPath);

      // Branching spark discharge
      if (Math.random() < 0.25 && _bfDebuffPtsOcc[3] === 0) {
        const len = 5 + Math.random() * 8;
        const ba = Math.random() * Math.PI * 2;
        const bx = _bfDebuffPtsX[3] + Math.cos(ba) * len;
        const by = _bfDebuffPtsY[3] + Math.sin(ba) * len;

        const sparkPath = new Path2D();
        sparkPath.moveTo(_bfDebuffPtsX[3], _bfDebuffPtsY[3]);
        sparkPath.lineTo(bx, by);

        ctx.lineWidth = 2.0; ctx.strokeStyle = '#000000'; ctx.stroke(sparkPath);
        ctx.lineWidth = 1.0; ctx.strokeStyle = '#B30000'; ctx.stroke(sparkPath);
        ctx.lineWidth = 0.45; ctx.strokeStyle = '#F3E8FF'; ctx.stroke(sparkPath);
      }
    }
  }

  ctx.restore();
}

export function drawVoidMarkEffect(ctx, baseRadius) {
  ctx.save();
  const time = Date.now();
  const bounceY = -baseRadius - 16 + Math.sin(time * 0.015) * 3;
  
  // Floating magic mark crest
  ctx.translate(0, bounceY);
  
  // Outer diamond lines (rotates opposite direction)
  ctx.save();
  ctx.rotate(-time * 0.002);
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 0);
  ctx.lineTo(0, 7);
  ctx.lineTo(-5, 0);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Inner rotating square (slow rotation)
  ctx.save();
  ctx.rotate(time * 0.003);
  ctx.strokeStyle = '#DA70D6';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-3, -3);
  ctx.lineTo(3, -3);
  ctx.lineTo(3, 3);
  ctx.lineTo(-3, 3);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  // Inner soft glow
  ctx.fillStyle = 'rgba(186, 85, 211, 0.4)';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  
  // Center bright dot
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, 1.8, 0, Math.PI * 2);
  ctx.restore();
}

/**
 * Draws a wet, glistening, bubbling/swelling flesh cyst animation on the target body.
 * Triggered when the target is paralyzed by Mahito and about to explode (Soul Rupture).
 * Boils protrude from the EDGE of the body circle outward, starting as tiny bumps
 * and slowly growing grotesquely large before detonation.
 */
export function drawMahitoFleshBubblyDeformLocal(ctx, r = 25, paralyzeTimer = 45, color = '#A855F7', entity = null) {
  // progress: 0 at start of paralysis -> 1 at detonation
  const maxDuration = 45;
  const progress = 1.0 - Math.max(0.0, Math.min(1.0, (paralyzeTimer || maxDuration) / maxDuration));

  // Clear seeds when paralysis expires
  if (paralyzeTimer <= 2 && entity) {
    entity._mahitoFleshDeformSeeds = null;
  }

  // Generate persistent random mutation seeds per entity (6 to 9 boils)
  let seeds = null;
  if (entity) {
    if (!entity._mahitoFleshDeformSeeds || entity._mahitoFleshDeformSeeds.length < 6) {
      entity._mahitoFleshDeformSeeds = [];
      const count = 6 + Math.floor(Math.random() * 4); // 6 to 9 random boils
      const boilColors = ['#D946EF', '#A855F7', '#C026D3', '#9333EA', '#E879F9'];
      for (let i = 0; i < count; i++) {
        entity._mahitoFleshDeformSeeds.push({
          angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.45, // evenly distributed around body edge
          maxSizeMult: 0.40 + Math.random() * 0.65,      // max boil radius relative to body r (0.40 to 1.05)
          phase: Math.random() * Math.PI * 2,             // animation wobble offset
          speed: 1.2 + Math.random() * 2.0,               // pulsation speed
          edgeOffset: 0.70 + Math.random() * 0.30,        // how far along the edge
          color: boilColors[i % boilColors.length]
        });
      }
    }
    seeds = entity._mahitoFleshDeformSeeds;
  } else {
    // Fallback static seeds
    seeds = [
      { angle: 2.3,  maxSizeMult: 0.75, phase: 0,   speed: 1.5, edgeOffset: 0.85, color: '#D946EF' },
      { angle: -0.8, maxSizeMult: 0.90, phase: 1.8, speed: 2.0, edgeOffset: 0.90, color: '#A855F7' },
      { angle: 3.8,  maxSizeMult: 0.65, phase: 3.5, speed: 1.2, edgeOffset: 0.80, color: '#C026D3' },
      { angle: 0.9,  maxSizeMult: 0.55, phase: 5.2, speed: 2.5, edgeOffset: 0.95, color: '#9333EA' },
      { angle: 5.1,  maxSizeMult: 0.70, phase: 2.0, speed: 1.8, edgeOffset: 0.88, color: '#E879F9' },
      { angle: 1.6,  maxSizeMult: 0.60, phase: 4.1, speed: 1.6, edgeOffset: 0.82, color: '#D946EF' }
    ];
  }

  ctx.save();

  const now = Date.now() * 0.007;

  // Immediate swelling curve: starts visibly at 35% size and balloons rapidly to full size
  const growthCurve = 0.35 + 0.65 * Math.pow(progress, 1.1);

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];

    // Pulsating wobble that intensifies as detonation approaches
    const wobbleIntensity = 0.10 + progress * 0.25;
    const wave = Math.sin(now * seed.speed + seed.phase) * wobbleIntensity;

    // Boil radius: starts noticeably and balloons to full size
    const boilR = Math.max(2.5, r * seed.maxSizeMult * growthCurve * (1.0 + wave));

    // Position: on the EDGE of the body circle, protruding outward
    const edgeDist = r * seed.edgeOffset;
    const bx = Math.cos(seed.angle) * edgeDist;
    const by = Math.sin(seed.angle) * edgeDist;

    // Outer Cursed Energy Glow
    ctx.fillStyle = seed.color || '#A855F7';
    ctx.strokeStyle = '#3B0764';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(bx, by, boilR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 3D Wet Glare Specular Highlight (upper-left)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(bx - boilR * 0.28, by - boilR * 0.28, Math.max(1.0, boilR * 0.25), 0, Math.PI * 2);
    ctx.fill();

    // Secondary specular rim
    ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
    ctx.beginPath();
    ctx.arc(bx + boilR * 0.20, by + boilR * 0.20, Math.max(0.8, boilR * 0.12), 0, Math.PI * 2);
    ctx.fill();

    // Surgical stitch lines across swelling cysts
    if (boilR > 5) {
      ctx.strokeStyle = '#181C26';
      ctx.lineWidth = 1.2;
      const cosA = Math.cos(seed.angle + Math.PI / 2);
      const sinA = Math.sin(seed.angle + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(bx - cosA * boilR * 0.55, by - sinA * boilR * 0.55);
      ctx.lineTo(bx + cosA * boilR * 0.55, by + sinA * boilR * 0.55);
      ctx.stroke();

      // Cross stitches along seam
      const numHatches = 3;
      for (let j = 0; j < numHatches; j++) {
        const t = -0.35 + (j / (numHatches - 1)) * 0.70;
        const hx = bx + cosA * boilR * 0.55 * t;
        const hy = by + sinA * boilR * 0.55 * t;
        const px = -sinA * 2.8;
        const py = cosA * 2.8;
        ctx.beginPath();
        ctx.moveTo(hx - px, hy - py);
        ctx.lineTo(hx + px, hy + py);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
}

export function drawParalyzeEffect(ctx, baseRadius, isMahito = false, paralyzeTimer = 45, color = '#FFEE58', entity = null) {
  ctx.save();

  // Counteract fighter body rotation and vertical flipping so the halo stays strictly upright above the head in world space
  if (entity) {
    const angle = entity._isWinnerReveal ? 0 : (entity.gunAngle !== undefined ? entity.gunAngle : (entity.angle || 0));
    const facingLeft = Math.abs(angle) > Math.PI / 2;
    if (facingLeft && !entity.isSpinning) {
      ctx.scale(1, -1);
    }
    ctx.rotate(-angle);
  }

  const time = Date.now() * 0.004;
  const numRings = 2;
  
  // 1. Tilted 3D golden rings orbiting above head
  for (let i = 0; i < numRings; i++) {
    ctx.save();
    
    // Tilted orbit center above the head
    const yOffset = -baseRadius - 14 + (i * 5);
    ctx.translate(0, yOffset);
    
    // 3D Tilt perspective (squish Y axis)
    ctx.scale(1.0, 0.35);
    
    // Rotate ring over time
    const angleOffset = i * Math.PI + time;
    ctx.rotate(angleOffset);
    
    // Orbit radius
    const r = baseRadius * 0.75;
    
    // Draw the ring path
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = isMahito 
      ? `rgba(217, 70, 239, ${0.6 + 0.3 * Math.sin(time * 1.5 + i)})`
      : `rgba(255, 215, 0, ${0.6 + 0.3 * Math.sin(time * 1.5 + i)})`;
    ctx.lineWidth = 2.2;
    ctx.stroke();
    
    // Draw 2 small stars/particles orbiting on opposite sides of the ring
    const numStars = 2;
    for (let s = 0; s < numStars; s++) {
      const starAngle = (time * 1.8) + (s * Math.PI);
      const sx = Math.cos(starAngle) * r;
      const sy = Math.sin(starAngle) * r;
      
      // Draw 4-point star shape
      ctx.save();
      ctx.translate(sx, sy);
      
      // Un-scale Y axis to keep star drawn normally
      ctx.scale(1.0, 1.0 / 0.35);
      
      ctx.beginPath();
      // Draw 4-point star polygon
      ctx.moveTo(0, -6.5);
      ctx.lineTo(1.8, -1.8);
      ctx.lineTo(6.5, 0);
      ctx.lineTo(1.8, 1.8);
      ctx.lineTo(0, 6.5);
      ctx.lineTo(-1.8, 1.8);
      ctx.lineTo(-6.5, 0);
      ctx.lineTo(-1.8, -1.8);
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = isMahito ? 'rgba(217, 70, 239, 0.95)' : 'rgba(255, 235, 59, 0.95)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      
      ctx.restore();
    }
    
    ctx.restore();
  }
  
  // 2. Body crackling sparks (yellow or Mahito magenta/violet cursed energy discharges)
  const seed = Math.floor(Date.now() / 60) % 5;
  if (seed < 4) {
    ctx.strokeStyle = isMahito ? '#D946EF' : '#FFEE58';
    ctx.lineWidth = isMahito ? 2.0 : 1.8;
    ctx.beginPath();
    
    // Generate a random lightning bolt on the body
    const startAngle = Math.random() * Math.PI * 2;
    const startR = Math.random() * (baseRadius * 0.7);
    let lx = Math.cos(startAngle) * startR;
    let ly = Math.sin(startAngle) * startR;
    
    ctx.moveTo(lx, ly);
    
    // Add 2-3 zig-zag segments
    const segments = 2 + Math.floor(Math.random() * 2);
    for (let j = 0; j < segments; j++) {
      lx += (Math.random() - 0.5) * 16;
      ly += (Math.random() - 0.5) * 16;
      ctx.lineTo(lx, ly);
    }
    ctx.stroke();
  }

  if (isMahito && entity && entity.characterId !== 'mahito' && entity.type !== 'mahito' && !entity.isEvasionMinion) {
    drawMahitoFleshBubblyDeformLocal(ctx, baseRadius, paralyzeTimer, color, entity);
  }
  
  ctx.restore();
}

// Pre-allocated static arrays for Soul Disfigurement suture positions (Zero GC churn)
const _S1_STK1 = [0.35, 0.45];
const _S1_STK2 = [0.35, 0.45, 0.70, 0.80];
const _S1_STK3 = [0.35, 0.45, 0.70, 0.80, 0.15];
const _S2_STK4 = [0.30, 0.40];
const _S2_STK6 = [0.30, 0.40, 0.70, 0.80];
const _S2_STK8 = [0.30, 0.40, 0.70, 0.80, 0.15];
const _S3_STK7 = [0.40, 0.50];
const _S3_STK9 = [0.40, 0.50, 0.20, 0.80];

/**
 * Draws Mahito's Soul Disfigurement Stitches on an afflicted enemy's body.
 * Features surgical suture cuts with paired cross-stitches, knot dots, and cursed energy seepage.
 * High-performance optimized (Zero per-frame allocations).
 */
export function drawSoulDisfigurementEffect(ctx, baseRadius, stacks = 1) {
  if (stacks <= 0) return;

  ctx.save();
  const r = baseRadius || 25;
  const now = Date.now() * 0.005;
  const pulse = Math.sin(now * 2.5) * 0.5 + 0.5;

  // 1. Subtle Soul Distortion Rim Ripple on Target Body
  ctx.strokeStyle = `rgba(217, 70, 239, ${(0.35 + pulse * 0.25).toFixed(3)})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, r + 2.5 + pulse * 1.5, 0, Math.PI * 2);
  ctx.stroke();

  // Helper to draw a surgical suture cut with cross-stitches on the enemy's body
  const drawSutureSeam = (x1, y1, x2, y2, stitchPositions, crossLen = 3.2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;

    // A. Cursed Energy Seepage Underlay (Magenta/Violet Soul Glow)
    ctx.strokeStyle = `rgba(217, 70, 239, ${(0.45 + pulse * 0.35).toFixed(3)})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // B. Dark Incision Suture Line
    ctx.strokeStyle = '#181C26';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // C. Cross-Stitch Loops / Staples Crossing the Cut (|| ... ||)
    ctx.strokeStyle = '#10141D';
    ctx.fillStyle = '#10141D';
    ctx.lineWidth = 1.4;

    ctx.beginPath();
    for (let i = 0; i < stitchPositions.length; i++) {
      const t = stitchPositions[i];
      const cx = x1 + dx * t;
      const cy = y1 + dy * t;
      const sx1 = cx - px * crossLen;
      const sy1 = cy - py * crossLen;
      const sx2 = cx + px * crossLen;
      const sy2 = cy + py * crossLen;

      ctx.moveTo(sx1, sy1);
      ctx.lineTo(sx2, sy2);
    }
    ctx.stroke();

    // Subtle knot endpoint dots
    ctx.beginPath();
    for (let i = 0; i < stitchPositions.length; i++) {
      const t = stitchPositions[i];
      const cx = x1 + dx * t;
      const cy = y1 + dy * t;
      const sx1 = cx - px * crossLen;
      const sy1 = cy - py * crossLen;
      const sx2 = cx + px * crossLen;
      const sy2 = cy + py * crossLen;

      ctx.arc(sx1, sy1, 0.8, 0, Math.PI * 2);
      ctx.arc(sx2, sy2, 0.8, 0, Math.PI * 2);
    }
    ctx.fill();
  };

  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.mahito) ? CONFIG.mahito : {};
  const maxStacks = cfg.soulDisfigurement?.maxStacks || 5;

  // Suture 1: Transverse Diagonal Suture across the upper-mid body (1+ stacks)
  const s1Stitches = (stacks >= 3) ? _S1_STK3 : (stacks >= 2 ? _S1_STK2 : _S1_STK1);
  drawSutureSeam(-r * 0.70, -r * 0.25, r * 0.65, r * 0.15, s1Stitches, 3.4);

  // Suture 2: Vertical / Curved Suture down the left flank (3+ stacks)
  if (stacks >= 3 || stacks >= Math.ceil(maxStacks * 0.6)) {
    const s2Stitches = (stacks >= maxStacks) ? _S2_STK8 : (stacks >= 4 ? _S2_STK6 : _S2_STK4);
    drawSutureSeam(-r * 0.25, -r * 0.70, -r * 0.15, r * 0.65, s2Stitches, 3.0);
  }

  // Suture 3: Forehead / Crest Accent Suture (Max Stacks)
  if (stacks >= maxStacks) {
    const s3Stitches = _S3_STK9;
    drawSutureSeam(r * 0.10, -r * 0.65, r * 0.55, -r * 0.30, s3Stitches, 2.6);
  }

  // Orbiting subtle soul distortion wisps (scales smoothly with stacks)
  const wispCount = Math.min(3, Math.ceil(stacks / 2));
  const orbitR = r * 1.30;
  for (let i = 0; i < wispCount; i++) {
    const angle = now * 1.5 + (i * (Math.PI * 2 / wispCount));
    const wx = Math.cos(angle) * orbitR;
    const wy = Math.sin(angle) * orbitR;

    ctx.fillStyle = 'rgba(217, 70, 239, 0.50)';
    ctx.beginPath();
    ctx.arc(wx, wy, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FAF5FF';
    ctx.beginPath();
    ctx.arc(wx, wy, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws Mahito's Floating Surgical Stitch Indicator above an afflicted enemy's head.
 * Features:
 * - NO card background, NO pill container (purely transparent floating surgical stitches)
 * - Dynamically scales to any maxStacks (e.g. 5 stacks)
 * - Active stacks glow with vivid magenta/violet cursed energy sutures and staple knots
 * - Inactive remaining stacks show as dim suture marks
 * - Optimized with zero per-frame context allocations and batched path draw calls.
 */
export function drawSoulDisfigurementCounter(ctx, x, y, baseRadius, stacks = 1, timer = 300) {
  if (stacks <= 0) return;

  ctx.save();
  const r = baseRadius || 25;
  const now = Date.now() * 0.004;
  const hoverY = Math.sin(now * 2.5) * 1.5;

  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.mahito) ? CONFIG.mahito : {};
  const indicatorScale = cfg.soulDisfigurement?.stitchIndicatorScale ?? 1.70;
  const badgeX = x;
  const badgeY = y - r - (16 * indicatorScale) + hoverY;

  ctx.translate(badgeX, badgeY);
  ctx.scale(indicatorScale, indicatorScale);

  const maxStacks = cfg.soulDisfigurement?.maxStacks || 5;
  const isCritical = stacks >= maxStacks;
  const pulse = Math.sin(now * 4) * 0.5 + 0.5;

  const gap = 5.6; // Horizontal spacing per stitch staple
  const halfTrack = ((maxStacks - 1) * gap) / 2;

  // 1. Suture Tether Threads extending down toward the head
  ctx.strokeStyle = '#181C26';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-halfTrack * 0.45, 0);
  ctx.lineTo(-halfTrack * 0.30, 7.5);
  ctx.moveTo(halfTrack * 0.45, 0);
  ctx.lineTo(halfTrack * 0.30, 7.5);
  // Tiny cross-ticks on tether sutures
  ctx.moveTo(-halfTrack * 0.45 - 2.0, 3.8);
  ctx.lineTo(-halfTrack * 0.30 + 2.0, 3.8);
  ctx.moveTo(halfTrack * 0.30 - 2.0, 3.8);
  ctx.lineTo(halfTrack * 0.45 + 2.0, 3.8);
  ctx.stroke();

  // 2. Main Suture Cut Seam Line
  // Magenta glow underlay
  ctx.strokeStyle = isCritical ? `rgba(255, 0, 127, ${(0.6 + pulse * 0.4).toFixed(3)})` : `rgba(217, 70, 239, ${(0.35 + pulse * 0.3).toFixed(3)})`;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-halfTrack - 4, 0);
  ctx.lineTo(halfTrack + 4, 0);
  ctx.stroke();

  // Dark surgical incision cut
  ctx.strokeStyle = '#181C26';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-halfTrack - 3.5, 0);
  ctx.lineTo(halfTrack + 3.5, 0);
  ctx.stroke();

  // 3. Batched Draw for Inactive Stitches (Dim Suture Marks)
  if (stacks < maxStacks) {
    ctx.strokeStyle = '#252F44';
    ctx.fillStyle = '#161B27';
    ctx.lineWidth = 1.0;

    ctx.beginPath();
    for (let i = stacks; i < maxStacks; i++) {
      const sx = -halfTrack + i * gap;
      ctx.moveTo(sx, -2.6);
      ctx.lineTo(sx, 2.6);
    }
    ctx.stroke();

    ctx.beginPath();
    for (let i = stacks; i < maxStacks; i++) {
      const sx = -halfTrack + i * gap;
      ctx.arc(sx, -2.6, 0.65, 0, Math.PI * 2);
      ctx.arc(sx, 2.6, 0.65, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  // 4. Batched Draw for Active Stitches (Glowing Cursed Energy Sutures)
  const activeCount = Math.min(maxStacks, stacks);
  if (activeCount > 0) {
    if (isCritical) {
      // Critical Max Stack: Blazing Magenta & Hot Pink Flare
      ctx.fillStyle = 'rgba(255, 0, 127, 0.40)';
      ctx.beginPath();
      for (let i = 0; i < activeCount; i++) {
        const sx = -halfTrack + i * gap;
        const flarePulse = Math.sin(now * 10 + i * 0.8) * 1.2;
        ctx.arc(sx, 0, 4.5 + flarePulse, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.strokeStyle = '#FF007F';
      ctx.fillStyle = '#FF007F';
      ctx.lineWidth = 1.6;

      ctx.beginPath();
      for (let i = 0; i < activeCount; i++) {
        const sx = -halfTrack + i * gap;
        ctx.moveTo(sx, -4.6);
        ctx.lineTo(sx, 4.6);
      }
      ctx.stroke();

      ctx.beginPath();
      for (let i = 0; i < activeCount; i++) {
        const sx = -halfTrack + i * gap;
        ctx.arc(sx, -4.6, 1.0, 0, Math.PI * 2);
        ctx.arc(sx, 4.6, 1.0, 0, Math.PI * 2);
      }
      ctx.fill();

      // White core dots
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      for (let i = 0; i < activeCount; i++) {
        const sx = -halfTrack + i * gap;
        ctx.arc(sx, 0, 1.0, 0, Math.PI * 2);
      }
      ctx.fill();
    } else {
      // Active Vivid Magenta/Violet Stitch Staples
      ctx.fillStyle = `rgba(217, 70, 239, ${(0.30 + pulse * 0.25).toFixed(3)})`;
      ctx.beginPath();
      for (let i = 0; i < activeCount; i++) {
        const sx = -halfTrack + i * gap;
        ctx.arc(sx, 0, 3.8, 0, Math.PI * 2);
      }
      ctx.fill();

      // Cross stitch vertical staples
      ctx.strokeStyle = '#D946EF';
      ctx.fillStyle = '#D946EF';
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      for (let i = 0; i < activeCount; i++) {
        const sx = -halfTrack + i * gap;
        ctx.moveTo(sx, -4.0);
        ctx.lineTo(sx, 4.0);
      }
      ctx.stroke();

      // Knot endpoint dots
      ctx.beginPath();
      for (let i = 0; i < activeCount; i++) {
        const sx = -halfTrack + i * gap;
        ctx.arc(sx, -4.0, 0.9, 0, Math.PI * 2);
        ctx.arc(sx, 4.0, 0.9, 0, Math.PI * 2);
      }
      ctx.fill();

      // White core highlights
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      for (let i = 0; i < activeCount; i++) {
        const sx = -halfTrack + i * gap;
        ctx.arc(sx, 0, 0.8, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Renders embedded Mahito bone/flesh spikes impaled into an enemy's body.
 * Features bruised blood puncture sockets, dual-facet two-tone bone shading, and fading cursed energy dissolution.
 */
export function drawEmbeddedMahitoSpikes(ctx, baseRadius, entity) {
  const spikes = entity._embeddedMahitoSpikes;
  if (!spikes || spikes.length === 0) return;

  for (let i = spikes.length - 1; i >= 0; i--) {
    const spk = spikes[i];
    spk.duration--;
    if (spk.duration <= 0) {
      spikes.splice(i, 1);
      continue;
    }

    const alpha = Math.min(1.0, spk.duration / 25);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(spk.relX, spk.relY);
    ctx.rotate(spk.angle);

    const sLen = (spk.length || 18) * 0.90;
    const halfW = (spk.width || 4.5) * 0.52;
    const pDepth = spk.penetrationDepth || 0.35;
    const rootX = -sLen * pDepth;
    const tipX = sLen * (1.0 - pDepth * 0.4);

    // 1. Bruised blood & Cursed Energy puncture entry socket
    ctx.beginPath();
    ctx.ellipse(0, 0, halfW * 2.0, halfW * 1.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = spk.isTransformed ? 'rgba(217, 70, 239, 0.85)' : 'rgba(185, 28, 28, 0.88)';
    ctx.fill();

    // 2. Impaled Bone Spike Polygon (Piercing outward from inside/across the body)
    if (spk.isTransformed) {
      ctx.beginPath();
      ctx.moveTo(rootX, 0); // embedded root deep inside flesh
      ctx.lineTo(0, -halfW);
      ctx.lineTo(tipX, 0);  // sharp protruding tip
      ctx.lineTo(0, halfW);
      ctx.closePath();
      ctx.fillStyle = '#0E1322';
      ctx.fill();
      ctx.strokeStyle = '#D946EF';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Glowing core spine line
      ctx.beginPath();
      ctx.moveTo(rootX * 0.5, 0);
      ctx.lineTo(tipX * 0.85, 0);
      ctx.strokeStyle = '#F5D0FE';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      // Left facet (Highlight side)
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(0, -halfW);
      ctx.lineTo(tipX, 0);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();

      // Right facet (Shadow side)
      ctx.fillStyle = '#64748B';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(tipX, 0);
      ctx.lineTo(0, halfW);
      ctx.closePath();
      ctx.fill();

      // Sharp ink outline
      ctx.strokeStyle = '#181C26';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(rootX, 0);
      ctx.lineTo(0, -halfW);
      ctx.lineTo(tipX, 0);
      ctx.lineTo(0, halfW);
      ctx.closePath();
      ctx.stroke();

      // Crimson blood stain dripping around embedded root
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.arc(0, 0, halfW * 1.0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/**
 * Renders a sleek floating pill health bar above a minion/illusion's head (Rika style).
 */
export function drawMinionHealthBar(ctx, x, y, width = 38, height = 7, hp = 100, maxHp = 100) {
  if (hp <= 0) return;
  const pct = Math.max(0, Math.min(1.0, hp / (maxHp || 1)));
  const w = width || 38;
  const h = height || 7;
  const hw = w / 2;
  const hh = h / 2;
  const cornerR = hh; // Perfect pill capsule rounded ends

  ctx.save();
  ctx.translate(x, y);

  // 1. Sleek Outer Drop Shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1.5;

  // 2. Dark Obsidian Pill Background Track & Border
  ctx.fillStyle = 'rgba(15, 17, 26, 0.92)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.30)';
  ctx.lineWidth = 1.0;

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(-hw, -hh, w, h, cornerR);
  } else {
    ctx.arc(-hw + cornerR, 0, cornerR, Math.PI / 2, -Math.PI / 2);
    ctx.arc(hw - cornerR, 0, cornerR, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
  }
  ctx.fill();

  // Clear shadow before stroke & fill
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.stroke();

  // 3. Depleted Red Track & Active Green Fill Inside Clipped Pill
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(-hw + 1, -hh + 1, w - 2, h - 2, Math.max(1, cornerR - 1));
  } else {
    ctx.arc(-hw + 1 + cornerR, 0, cornerR - 1, Math.PI / 2, -Math.PI / 2);
    ctx.arc(hw - 1 - cornerR, 0, cornerR - 1, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
  }
  ctx.clip();

  // Depleted Crimson Red Fill
  ctx.fillStyle = 'rgba(185, 28, 28, 0.85)';
  ctx.fillRect(-hw + 1, -hh + 1, w - 2, h - 2);

  // Active Green Health Fill Bar
  if (pct > 0) {
    const fillW = Math.max(2, (w - 2) * pct);
    const startX = -hw + 1;

    let mainColor = '#22C55E';
    let endColor = '#16A34A';

    if (pct < 0.25) {
      mainColor = '#EF4444';
      endColor = '#B91C1C';
    } else if (pct < 0.50) {
      mainColor = '#F59E0B';
      endColor = '#D97706';
    }

    const grad = ctx.createLinearGradient(startX, 0, startX + fillW, 0);
    grad.addColorStop(0, mainColor);
    grad.addColorStop(1, endColor);

    ctx.fillStyle = grad;
    ctx.fillRect(startX, -hh + 1, fillW, h - 2);

    // Sleek White Gloss Top Highlight Line
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.fillRect(startX, -hh + 1, fillW, Math.max(1, (h - 2) * 0.35));
  }

  ctx.restore();
  ctx.restore();
}

/** Declarative registry for all global status overlays rendered on fighters */
export const STATUS_OVERLAY_REGISTRY = [
  {
    id: 'slow',
    isActive: (f) => !f.purpleHitTimer && ((f.statusEffects && f.statusEffects.fighter.slowTimer > 0) || f.slowTimer > 0),
    render: (ctx, baseRadius, f) => {
      const trappedInTojiUltimate = typeof state !== 'undefined' && state.fighters && state.fighters.some(other => 
        other && other.ultimateActive && other.ultimateTarget === f && (other.type === 'toji' || other.characterId === 'toji')
      );
      if (!trappedInTojiUltimate) {
        drawSlowEffect(ctx, baseRadius);
      }
    }
  },
  {
    id: 'electricStun',
    isActive: (f) => f.electricStunTimer > 0,
    render: (ctx, baseRadius, f) => drawElectricStunEffect(ctx, baseRadius, false)
  },
  {
    id: 'pureLoveBeamRecovery',
    isActive: (f) => f.pureLoveBeamRecoveryTimer > 0,
    render: (ctx, baseRadius, f) => {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 20, 147, 0.45)';
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fill();
      
      const time = Date.now();
      const pulse = (Math.sin(time / 100) + 1) / 2;
      ctx.strokeStyle = 'rgba(255, 105, 180, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, baseRadius * (1.05 + pulse * 0.15), baseRadius * (1.05 + pulse * 0.15), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    id: 'dubstepStun',
    isActive: (f) => f.dubstepStunVisualTimer > 0,
    render: (ctx, baseRadius, f) => drawDubstepStunEffect(ctx, baseRadius, f.dubstepStunVisualTimer)
  },
  {
    id: 'crimsonElectrified',
    isActive: (f) => f.crimsonElectrifiedTimer > 0,
    render: (ctx, baseRadius, f) => drawCrimsonElectrifiedEffect(ctx, baseRadius, f.crimsonElectrifiedTrickster)
  },
  {
    id: 'poison',
    isActive: (f) => f.poisonTicks > 0,
    render: (ctx, baseRadius, f) => drawPoisonEffect(ctx, baseRadius)
  },
  {
    id: 'bleed',
    isActive: (f) => f.bleedTimer > 0,
    render: (ctx, baseRadius, f) => drawBleedEffect(ctx, baseRadius, f.bleedTimer, f)
  },
  {
    id: 'silence',
    isActive: (f) => f.silenceTimer > 0,
    render: (ctx, baseRadius, f) => drawSilenceEffect(ctx, baseRadius)
  },
  {
    id: 'thunderRoots',
    isActive: (f) => f.thunderRootsTimer > 0,
    render: (ctx, baseRadius, f) => drawThunderRootsEffect(ctx, baseRadius)
  },
  {
    id: 'nanamiArmorFracture',
    isActive: (f) => f.nanamiArmorFractureTimer > 0,
    render: (ctx, baseRadius, f) => {
      ctx.save();
      const fracTime = Date.now() * 0.005;
      const pulse = 0.5 + 0.5 * Math.sin(fracTime * 3);
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.55 + 0.35 * pulse})`;
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      ctx.moveTo(-baseRadius * 0.6, -baseRadius * 0.3);
      ctx.lineTo(-baseRadius * 0.1, 0);
      ctx.lineTo(baseRadius * 0.5, -baseRadius * 0.4);
      ctx.moveTo(-baseRadius * 0.1, 0);
      ctx.lineTo(baseRadius * 0.2, baseRadius * 0.6);
      ctx.stroke();

      ctx.strokeStyle = `rgba(212, 175, 55, ${0.35 * pulse})`;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 1.04, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  },
  {
    id: 'burn',
    isActive: (f) => f.burnTimer > 0,
    render: (ctx, baseRadius, f) => {
      const offset = baseRadius * 0.15;
      const grad = ctx.createRadialGradient(-offset, -offset, 0, 0, 0, baseRadius);
      const pulse = 0.05 * Math.sin(Date.now() / 100);
      grad.addColorStop(0, 'rgba(255, 255, 220, 0.65)');
      grad.addColorStop(0.35, `rgba(255, 130, 0, ${0.5 + pulse})`);
      grad.addColorStop(0.75, `rgba(200, 30, 0, ${0.35 + pulse})`);
      grad.addColorStop(1, 'rgba(100, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: 'blackFlashDebuff',
    isActive: (f) => f.blackFlashDebuffTimer > 0,
    render: (ctx, baseRadius, f) => drawBlackFlashDebuffEffect(ctx, baseRadius)
  },
  {
    id: 'voidMark',
    isActive: (f) => f.voidMarkTimer > 0,
    render: (ctx, baseRadius, f) => drawVoidMarkEffect(ctx, baseRadius)
  }
];

/** Dynamically register a new status overlay renderer */
export function registerStatusOverlay(overlayConfig) {
  if (overlayConfig && typeof overlayConfig.render === 'function' && typeof overlayConfig.isActive === 'function') {
    STATUS_OVERLAY_REGISTRY.push(overlayConfig);
  }
}

