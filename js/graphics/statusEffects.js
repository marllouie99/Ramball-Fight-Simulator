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
  
  // Clean, bright cyan flash on the body (faint so it doesn't hide other effects)
  ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  // OPTIMIZATION: Skip shockwaves on low-end machines
  if (!useAggressiveMode) {
    // Expanding EMP / energy shockwaves
    const timeFactor1 = (Date.now() % 200) / 200; // Loops every 200ms
    const timeFactor2 = ((Date.now() + 100) % 200) / 200; // Offset by 100ms
    
    // Inner thicker shockwave
    ctx.strokeStyle = `rgba(0, 255, 255, ${1 - timeFactor1})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius * (1 + timeFactor1 * 1.5), 0, Math.PI * 2);
    ctx.stroke();

    // Outer thinner shockwave
    ctx.strokeStyle = `rgba(0, 255, 255, ${1 - timeFactor2})`;
    ctx.lineWidth = 2;
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
}

/**
 * Renders the snappy, 3D orbiting Black Flash visual debuff on the enemy.
 */
export function drawBlackFlashDebuffEffect(ctx, baseRadius) {
  ctx.save();
  const t = Date.now();
  
  // High speed phase for stroboscopic crackle
  const pulse = Math.sin(t * 0.04) * 0.15 + 0.75;
  ctx.globalAlpha = pulse;

  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';

  // We draw 3 tilted orbiting electric bands (enlarged for visibility)
  const bands = [
    { rx: baseRadius * 1.62, ry: baseRadius * 0.72, tilt: 0.5, speed: 0.006 },
    { rx: baseRadius * 1.62, ry: baseRadius * 0.72, tilt: -0.6, speed: -0.007 },
    { rx: baseRadius * 1.50, ry: baseRadius * 0.85, tilt: 1.2, speed: 0.005 }
  ];

  for (let b = 0; b < bands.length; b++) {
    const band = bands[b];
    // Base angle orbits around body
    const baseAngle = t * band.speed + b * 2.1;
    // Disjointed, snapping electric arcs
    const arcLen = 0.5 + Math.sin(t * 0.045 + b * 11) * 0.35; // fluctuating length
    
    const startTheta = baseAngle;
    const endTheta = baseAngle + arcLen;
    
    const steps = 6;
    const segments = [];
    
    for (let i = 0; i <= steps; i++) {
      const theta = startTheta + (i / steps) * arcLen;
      
      const x0 = band.rx * Math.cos(theta);
      const y0 = band.ry * Math.sin(theta);
      const z = Math.sin(theta); // depth indicator: negative is behind

      // Aggressive zig-zag displacement (highly snappy)
      let jx = 0;
      let jy = 0;
      if (i > 0 && i < steps) {
        const displace = 4.5 + Math.random() * 5.5;
        jx = (Math.random() - 0.5) * displace;
        jy = (Math.random() - 0.5) * displace;
      }

      // Rotate coordinates
      const rx_rot = (x0 + jx) * Math.cos(band.tilt) - (y0 + jy) * Math.sin(band.tilt);
      const ry_rot = (x0 + jx) * Math.sin(band.tilt) + (y0 + jy) * Math.cos(band.tilt);
      
      // Occlusion test: behind the sphere and inside radius
      const dist = Math.hypot(rx_rot, ry_rot);
      const occluded = (z < 0 && dist < baseRadius - 1.5);

      segments.push({
        x: rx_rot,
        y: ry_rot,
        occluded
      });
    }

    // Render layers
    const drawLayer = (width, style) => {
      ctx.lineWidth = width;
      ctx.strokeStyle = style;
      ctx.beginPath();
      
      let drawing = false;
      for (let i = 0; i < segments.length; i++) {
        const pt = segments[i];
        if (!pt.occluded) {
          if (!drawing) {
            ctx.moveTo(pt.x, pt.y);
            drawing = true;
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        } else {
          if (drawing) {
            ctx.stroke();
            ctx.beginPath();
            drawing = false;
          }
        }
      }
      if (drawing) ctx.stroke();
    };

    // Draw layers: black backing -> crimson core -> lilac highlight
    drawLayer(3.0, '#000000');
    drawLayer(1.5, '#B30000');
    drawLayer(0.65, '#F3E8FF');

    // Add tiny branching spark discharge from a node
    if (Math.random() < 0.35 && segments.length > 3) {
      const node = segments[3];
      if (!node.occluded) {
        const len = 5 + Math.random() * 9;
        const ba = Math.random() * Math.PI * 2;
        const bx = node.x + Math.cos(ba) * len;
        const by = node.y + Math.sin(ba) * len;

        ctx.lineWidth = 2.0;
        ctx.strokeStyle = '#000000';
        ctx.beginPath(); ctx.moveTo(node.x, node.y); ctx.lineTo(bx, by); ctx.stroke();

        ctx.lineWidth = 1.0;
        ctx.strokeStyle = '#B30000';
        ctx.beginPath(); ctx.moveTo(node.x, node.y); ctx.lineTo(bx, by); ctx.stroke();

        ctx.lineWidth = 0.45;
        ctx.strokeStyle = '#F3E8FF';
        ctx.beginPath(); ctx.moveTo(node.x, node.y); ctx.lineTo(bx, by); ctx.stroke();
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

export function drawParalyzeEffect(ctx, baseRadius, isMahito = false) {
  ctx.save();
  const time = Date.now() * 0.004;
  const numRings = 2;
  
  // 1. Tilted 3D golden rings orbiting above head
  for (let i = 0; i < numRings; i++) {
    ctx.save();
    
    // Tilted orbit center above the head
    const yOffset = -baseRadius - 12 + (i * 5);
    ctx.translate(0, yOffset);
    
    // 3D Tilt perspective (squish Y axis)
    ctx.scale(1.0, 0.35);
    
    // Rotate ring over time
    const angleOffset = i * Math.PI + time;
    ctx.rotate(angleOffset);
    
    // Orbit radius
    const r = baseRadius * 0.7;
    
    // Draw the ring path
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = isMahito 
      ? `rgba(0, 229, 255, ${0.5 + 0.3 * Math.sin(time * 1.5 + i)})`
      : `rgba(255, 215, 0, ${0.4 + 0.3 * Math.sin(time * 1.5 + i)})`;
    ctx.lineWidth = 2.0;
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
      ctx.moveTo(0, -6);
      ctx.lineTo(1.5, -1.5);
      ctx.lineTo(6, 0);
      ctx.lineTo(1.5, 1.5);
      ctx.lineTo(0, 6);
      ctx.lineTo(-1.5, 1.5);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-1.5, -1.5);
      ctx.closePath();
       ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.strokeStyle = isMahito ? 'rgba(217, 70, 239, 0.95)' : 'rgba(255, 235, 59, 0.9)';
      ctx.lineWidth = 1.0;
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
  
  ctx.restore();
}

/**
 * Draws Mahito's Soul Disfigurement debuff overlay on afflicted targets.
 * Features orbiting cursed soul distortion wisps and a pulsating resonance ring.
 * Strictly adheres to Rule #11 (Zero shadowBlur).
 */
export function drawSoulDisfigurementEffect(ctx, baseRadius, stacks = 1) {
  if (stacks <= 0) return;
  ctx.save();

  const now = Date.now() * 0.005;
  const pulse = Math.sin(now * 2) * 0.5 + 0.5;

  // 1. Subtle Soul Distortion Rim Ripple on Target Body
  ctx.strokeStyle = `rgba(217, 70, 239, ${(0.40 + pulse * 0.30).toFixed(3)})`;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius + 3 + pulse * 2, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Orbiting Cursed Soul Distortion Wisps
  const wispCount = Math.min(stacks, 2);
  const orbitR = baseRadius * 1.35;

  for (let i = 0; i < wispCount; i++) {
    const angle = now * 1.5 + (i * Math.PI);
    const wx = Math.cos(angle) * orbitR;
    const wy = Math.sin(angle) * orbitR;

    // Outer magenta soul aura
    ctx.fillStyle = 'rgba(217, 70, 239, 0.55)';
    ctx.beginPath();
    ctx.arc(wx, wy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright soul core
    ctx.fillStyle = '#FAF5FF';
    ctx.beginPath();
    ctx.arc(wx, wy, 2.0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws the Mahito-Themed Floating Soul Disfigurement Counter Badge.
 * Positioned right at the top of the enemy's body circle (not the head).
 * Features:
 * - Surgical suture-stitched dark soul plaque container
 * - 3 distinct soul vessel pips with vivid magenta/violet cursed energy
 * - Connected suture threads tethered to the target body
 * - Dynamic critical resonance flare when reaching max stacks
 * Strictly adheres to Rule #11 (Zero shadowBlur) & Rule #12 (Main Canvas 2D Text).
 */
export function drawSoulDisfigurementCounter(ctx, x, y, baseRadius, stacks = 1, timer = 300) {
  if (stacks <= 0) return;

  ctx.save();
  const now = Date.now() * 0.004;
  const hoverY = Math.sin(now * 2.5) * 1.6;
  const badgeX = x;
  const badgeY = y - baseRadius - 22 + hoverY;

  ctx.translate(badgeX, badgeY);

  const isCritical = stacks >= 3;
  const badgeW = 46;
  const badgeH = 17;
  const halfW = badgeW / 2;
  const halfH = badgeH / 2;

  // 1. Suture Tether Threads extending down to the top of the body
  ctx.save();
  ctx.strokeStyle = '#181C26';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-12, halfH);
  ctx.lineTo(-8, halfH + 7);
  ctx.moveTo(12, halfH);
  ctx.lineTo(8, halfH + 7);
  ctx.stroke();

  // Tiny cross-ticks on tether sutures
  ctx.beginPath();
  ctx.moveTo(-12, halfH + 3.5);
  ctx.lineTo(-8, halfH + 3.5);
  ctx.moveTo(8, halfH + 3.5);
  ctx.lineTo(12, halfH + 3.5);
  ctx.stroke();
  ctx.restore();

  // 2. Main Cursed Soul Talisman Plaque (Rounded capsule)
  ctx.fillStyle = '#0E121C';
  ctx.beginPath();
  ctx.roundRect(-halfW, -halfH, badgeW, badgeH, 6);
  ctx.fill();

  // Outer Talisman Border with Cursed Soul Rim Accent
  ctx.strokeStyle = isCritical ? '#FF007F' : '#1F293D';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (isCritical) {
    // Pulsing Critical Danger Rim
    const critPulse = (Math.sin(now * 8) + 1) / 2;
    ctx.strokeStyle = `rgba(217, 70, 239, ${(0.5 + critPulse * 0.5).toFixed(3)})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.roundRect(-halfW - 1.5, -halfH - 1.5, badgeW + 3, badgeH + 3, 7.5);
    ctx.stroke();
  }

  // 3. Iconic Horizontal Facial Stitches Motif across Plaque
  ctx.save();
  ctx.strokeStyle = '#181C26';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(-halfW + 4, 0);
  ctx.lineTo(halfW - 4, 0);
  ctx.stroke();

  // Cross stitch marks across suture cut
  const stitchPositions = [-17, -8, 0, 8, 17];
  for (const sx of stitchPositions) {
    ctx.beginPath();
    ctx.moveTo(sx, -2.2);
    ctx.lineTo(sx, 2.2);
    ctx.stroke();
  }
  ctx.restore();

  // 4. Three Soul Vessel Pips (Soul Shards)
  const slotX = [-13, 0, 13];
  const maxSlots = 3;

  for (let i = 0; i < maxSlots; i++) {
    const px = slotX[i];
    const py = 0;
    const isActive = i < stacks;
    const isThisMax = isCritical && isActive;

    if (!isActive) {
      // Inactive / Sunken Empty Soul Socket
      ctx.fillStyle = '#161B27';
      ctx.beginPath();
      ctx.arc(px, py, 4.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#252F44';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Dark cross-stitch thread inside socket
      ctx.strokeStyle = '#181C26';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(px - 1.8, py);
      ctx.lineTo(px + 1.8, py);
      ctx.moveTo(px, py - 1.8);
      ctx.lineTo(px, py + 1.8);
      ctx.stroke();
    } else {
      // Active Cursed Soul Pip
      ctx.save();

      if (isThisMax) {
        // Critical Max Slot: Blazing Magenta & Hot Pink Flare
        const flarePulse = Math.sin(now * 10 + i) * 1.5;
        ctx.fillStyle = 'rgba(255, 0, 127, 0.40)';
        ctx.beginPath();
        ctx.arc(px, py, 6.8 + flarePulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FF007F';
        ctx.beginPath();
        ctx.moveTo(px, py - 4.5);
        ctx.lineTo(px + 4.0, py);
        ctx.lineTo(px, py + 4.5);
        ctx.lineTo(px - 4.0, py);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Standard Active Soul Droplet (Vivid Magenta/Violet Glow)
        const pipPulse = (Math.sin(now * 4 + i * 1.2) + 1) / 2;
        ctx.fillStyle = `rgba(217, 70, 239, ${(0.35 + pipPulse * 0.25).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(px, py, 6.0, 0, Math.PI * 2);
        ctx.fill();

        // Diamond Cursed Soul Crystal
        ctx.fillStyle = '#D946EF';
        ctx.beginPath();
        ctx.moveTo(px, py - 4.2);
        ctx.lineTo(px + 3.6, py);
        ctx.lineTo(px, py + 4.2);
        ctx.lineTo(px - 3.6, py);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#F5D0FE';
        ctx.lineWidth = 0.9;
        ctx.stroke();

        // White-hot core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // 5. Connecting Cursed Energy Suture between active pips
  if (stacks >= 2) {
    ctx.save();
    ctx.strokeStyle = isCritical ? 'rgba(255, 0, 127, 0.85)' : 'rgba(217, 70, 239, 0.85)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(slotX[0], 0);
    ctx.lineTo(slotX[1], 0);
    if (stacks >= 3) {
      ctx.lineTo(slotX[2], 0);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 6. Crisp Top Micro-Label (Main Canvas 2D Text - Rule #12)
  ctx.font = 'bold 9px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  let labelText = `SOUL Ⅰ`;
  let labelColor = '#D946EF';

  if (stacks === 2) {
    labelText = `SOUL Ⅱ`;
    labelColor = '#D946EF';
  } else if (stacks >= 3) {
    labelText = `SOUL CRITICAL!`;
    labelColor = '#FF2A8D';
  }

  const labelY = -halfH - 2;
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.strokeText(labelText, 0, labelY);
  ctx.fillStyle = labelColor;
  ctx.fillText(labelText, 0, labelY);

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

