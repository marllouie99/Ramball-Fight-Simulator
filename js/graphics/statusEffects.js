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
    ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // 1. Pulse heat glow outline
  const glowIntensity = Math.abs(Math.sin(Date.now() / 150));
  ctx.save();
  ctx.strokeStyle = `rgba(255, 120, 0, ${0.4 + glowIntensity * 0.4})`;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius + 2 + glowIntensity * 2, 0, Math.PI * 2);
  ctx.stroke();

  // 2. Translucent fiery inner core
  ctx.fillStyle = `rgba(255, 50, 0, ${0.3 + glowIntensity * 0.2})`;
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();

  // 3. Embers popping off the body
  ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';
  for (let i = 0; i < 3; i++) {
    // Pseudo-random positions based on time to make them flicker/move
    const seed = (Date.now() / 80 + i * 13) % (Math.PI * 2);
    const rOffset = baseRadius * (0.6 + 0.5 * Math.sin(seed * 2));
    const x = Math.cos(seed) * rOffset;
    const y = Math.sin(seed) * rOffset;
    
    ctx.beginPath();
    ctx.arc(x, y, 1.5 + Math.sin(seed * 3) * 0.5, 0, Math.PI * 2);
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
  ctx.fill();
  
  ctx.restore();
}


