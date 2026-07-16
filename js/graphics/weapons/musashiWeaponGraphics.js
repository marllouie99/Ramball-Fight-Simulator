export function drawMusashiWeapons(ctx, fighter) {
  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  
  // Draw Dual Swords (Katana and Wakizashi)
  
  // Handle strike animation
  let rightSwordAngle = fighter.gunAngle;
    let leftSwordAngle = fighter.gunAngle;
    
    const strikeMax = 15;
    if (fighter.strikeTimer > 0) {
      const prog = 1 - (fighter.strikeTimer / strikeMax);
      // If niten active, separate logic
      if (fighter.nitenActiveTimer > 0 || fighter.isNitenSecondHit) {
        if (!fighter.isNitenSecondHit) {
          // Wakizashi quick strike
          leftSwordAngle = fighter.strikeAngle - Math.PI/4 + (prog * Math.PI/2);
          rightSwordAngle = fighter.gunAngle + Math.PI/6; // held back
        } else {
          // Katana heavy strike
          rightSwordAngle = fighter.strikeAngle - Math.PI/2 + (prog * Math.PI);
          leftSwordAngle = fighter.gunAngle - Math.PI/6; // held back
        }
      } else {
        // Basic dual strike
        rightSwordAngle = fighter.strikeAngle - Math.PI/4 + (prog * Math.PI/2);
        leftSwordAngle = fighter.strikeAngle + Math.PI/4 - (prog * Math.PI/2);
      }
    } else {
      // Idle hold
      rightSwordAngle = fighter.gunAngle + 0.3;
      leftSwordAngle = fighter.gunAngle - 0.3;
    }
    
    // Stance colors (Solid for intense glow)
    let aura = '#fff';
    if (fighter.currentStance === 'earth') aura = 'rgb(220, 100, 50)';
    if (fighter.currentStance === 'water') aura = 'rgb(50, 180, 255)';
    if (fighter.currentStance === 'fire') aura = 'rgb(255, 80, 20)';
    if (fighter.currentStance === 'wind') aura = 'rgb(80, 220, 130)';
    if (fighter.currentStance === 'void') aura = 'rgb(180, 80, 255)';
    
    // ── INK-BRUSH SMOKE TRAIL (after Phantom Flurry) ──
    if (fighter.flurrySmokeTimer > 0) {
      const smokeAlpha = fighter.flurrySmokeTimer / 150;
      _drawBrushSmokeTrail(ctx, rightSwordAngle, fighter.r, smokeAlpha, 87, false);
      _drawBrushSmokeTrail(ctx, leftSwordAngle, fighter.r, smokeAlpha, 58, true);
    }

    // Draw Katana (Right) — dark blade with glowing neon edge
    ctx.save();
    ctx.rotate(rightSwordAngle);
    drawKatana(ctx, fighter.r, 1.0, aura);
    ctx.restore();
    
    // Draw Wakizashi (Left) — shorter, wider metallic blade
    ctx.save();
    ctx.rotate(leftSwordAngle);
    ctx.scale(1, -1);
    drawWakizashi(ctx, fighter.r, 1.0, aura);
    ctx.restore();
  
  ctx.restore();
}

// ─────────────────────────────────────────────
// INK-BRUSH SMOKE TRAIL — calligraphy-style wispy trail on weapon
// Uses rough brush strokes with dark #374669 and white
// ─────────────────────────────────────────────
function _drawBrushSmokeTrail(ctx, bladeAngle, offset, alpha, bladeLen, isFlipped) {
  ctx.save();
  ctx.rotate(bladeAngle);
  if (isFlipped) ctx.scale(1, -1);
  
  const tipX = offset + bladeLen - 5;
  // Lock the animation to exactly 30 frames per second for a stylized look
  const fps30Time = Math.floor(performance.now() / (1000 / 30)) * (1000 / 30);
  const time = fps30Time * 0.003; // Very slow speed for calm sea wave flow
  
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // ── Dark Ink Flame Tongues ──
  // Each flame is a single curved stroke originating from the blade tip
  // Using round lineCap eliminates all square edges
  const numFlames = 7;
  
  for (let i = 0; i < numFlames; i++) {
    const phase = i * 2.718;
    const speed = 1 + (i % 3) * 0.2;
    const t = time * speed + phase;
    
    // Crescent silhouette: center flames are longest
    const distFromCenter = Math.abs(i - (numFlames - 1) / 2);
    const length = 160 - (distFromCenter * 30);
    
    const spread = (i - (numFlames - 1) / 2) * 3; // Tightly packed, lines overlap
    
    // Flowing control points
    const cp1x = tipX - (length * 0.35);
    const cp1y = (spread * 0.5) + Math.sin(t) * 10;
    
    const cp2x = tipX - (length * 0.7);
    const cp2y = (spread * 1.3) + Math.sin(t * 1.3) * 18;
    
    const endX = tipX - length;
    const endY = (spread * 1.8) + Math.sin(t * 1.6) * 22;
    
    // Draw as a single curved stroke — no flat edges anywhere
    ctx.beginPath();
    ctx.moveTo(tipX, 0); // All flames start from the same point
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
    
    const grad = ctx.createLinearGradient(tipX, 0, endX, endY);
    
    if (i === 3) {
      // Center flame: bright white core
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.95})`);
      grad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.5})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.lineWidth = 8;
    } else if (i === 2 || i === 4) {
      // Near-center: white highlight
      grad.addColorStop(0, `rgba(200, 210, 230, ${alpha * 0.8})`);
      grad.addColorStop(0.5, `rgba(200, 210, 230, ${alpha * 0.3})`);
      grad.addColorStop(1, 'rgba(200, 210, 230, 0)');
      ctx.lineWidth = 5;
    } else {
      // Outer flames: dark ink
      grad.addColorStop(0, `rgba(55, 70, 105, ${alpha * 0.9})`);
      grad.addColorStop(0.6, `rgba(42, 53, 80, ${alpha * 0.6})`);
      grad.addColorStop(1, 'rgba(42, 53, 80, 0)');
      ctx.lineWidth = 3 + (3 - distFromCenter);
    }
    
    ctx.strokeStyle = grad;
    ctx.stroke();
  }
  
  // ── Five Rings Particles ──
  // All 5 stance colors appear at once as glowing particles
  const stanceColors = [
    'rgb(220, 100, 50)',   // Earth (orange)
    'rgb(50, 180, 255)',   // Water (blue)
    'rgb(255, 80, 20)',    // Fire (red)
    'rgb(80, 220, 130)',   // Wind (green)
    'rgb(180, 80, 255)',   // Void (purple)
  ];
  
  for (let i = 0; i < 15; i++) {
    const colorIdx = i % 5;
    const t = time * 1.2 + i * 2.094; // Stagger each particle
    const driftX = (t * 55) % 180; // Drift distance loops
    
    // Fade out as they get further away
    const partAlpha = Math.max(0, 1 - (driftX / 180)) * alpha;
    if (partAlpha <= 0) continue;
    
    const px = tipX - driftX;
    const py = Math.sin(t * 1.8 + i) * 30 + Math.cos(i * 77) * 15;
    
    const size = Math.max(0.5, 3.5 - (driftX / 45)); // Shrink as they fly
    
    // Glow
    ctx.save();
    ctx.globalAlpha = partAlpha * 0.4;
    ctx.shadowColor = stanceColors[colorIdx];
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(px, py, size * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = stanceColors[colorIdx];
    ctx.fill();
    ctx.restore();
    
    // Core dot
    ctx.save();
    ctx.globalAlpha = partAlpha;
    ctx.beginPath();
    ctx.arc(px, py, size, 0, Math.PI * 2);
    ctx.fillStyle = stanceColors[colorIdx];
    ctx.fill();
    
    // Bright white center
    ctx.beginPath();
    ctx.arc(px, py, size * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${partAlpha})`;
    ctx.fill();
    ctx.restore();
  }
  
  ctx.restore();
}


// ─────────────────────────────────────────────
// KATANA — Dark blade with glowing neon edge (Reference Image 1)
// ─────────────────────────────────────────────
function drawKatana(ctx, offset, scale, auraColor) {
  ctx.save();
  ctx.translate(offset, 0);
  ctx.scale(scale, scale);

  // ── Pommel (end cap) ──
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-20, -3, 4, 6, 1);
  ctx.fill();
  ctx.stroke();

  // ── Handle with cutout holes (like reference) ──
  ctx.fillStyle = '#0d0d0d';
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-16, -2.5, 18, 5, 1);
  ctx.fill();
  ctx.stroke();

  // Cutout holes in handle
  ctx.fillStyle = '#050505';
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.roundRect(-13 + i * 5, -1, 3, 2, 0.5);
    ctx.fill();
    ctx.stroke();
  }

  // ── Tsuba (rectangular guard) ──
  ctx.fillStyle = '#1c1c1c';
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(0, -6, 3, 12, 1);
  ctx.fill();
  ctx.stroke();
  
  // Guard accent line
  ctx.fillStyle = '#555';
  ctx.fillRect(1, -5, 1, 10);

  // ── Habaki (blade collar) ──
  ctx.fillStyle = '#8a7a50';
  ctx.fillRect(3, -3.5, 4, 7);
  ctx.strokeStyle = '#6b5c3a';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(3, -3.5, 4, 7);

  // ── Blade body (dark, beautiful sweeping curve) ──
  ctx.beginPath();
  ctx.moveTo(7, -3.5);
  // Spine: smoothly curves up then flattens towards tip
  ctx.bezierCurveTo(30, -4.5, 60, -6.5, 82, -4); 
  // Kissaki (tip)
  ctx.lineTo(87, 0); 
  // Edge: sharp sweeping curve back to base
  ctx.bezierCurveTo(60, 3.5, 30, 3.5, 7, 3.5);
  ctx.closePath();

  // Dark steel gradient
  const bladeGrad = ctx.createLinearGradient(7, -5, 7, 4);
  bladeGrad.addColorStop(0, '#1a1a1e');
  bladeGrad.addColorStop(0.4, '#2a2a30');
  bladeGrad.addColorStop(0.6, '#1e1e22');
  bladeGrad.addColorStop(1, '#111115');
  ctx.fillStyle = bladeGrad;
  ctx.fill();

  // Thick dark outline for visibility
  ctx.strokeStyle = '#050505';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── Shinogi (ridge line running along the blade) ──
  ctx.beginPath();
  ctx.moveTo(7, -1);
  ctx.bezierCurveTo(30, -2, 60, -3, 82, -2);
  ctx.strokeStyle = '#3a3a42';
  ctx.lineWidth = 0.7;
  ctx.stroke();

  // ── Glowing Neon Edge (the signature feature from reference) ──
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  ctx.moveTo(7, 3.5);
  ctx.bezierCurveTo(30, 3.5, 60, 3.5, 87, 0);
  
  // Large faint outer bloom
  ctx.strokeStyle = auraColor;
  ctx.lineWidth = 14;
  ctx.globalAlpha = 0.15;
  ctx.stroke();

  // Medium outer glow
  ctx.lineWidth = 7;
  ctx.globalAlpha = 0.4;
  ctx.stroke();

  // Intense inner core glow
  ctx.lineWidth = 3;
  ctx.globalAlpha = 1.0;
  ctx.stroke();

  // Pure white center line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  
  ctx.restore();

  // ── Small accent notches along the spine ──
  ctx.fillStyle = '#555';
  for (const px of [15, 28, 40]) {
    ctx.beginPath();
    ctx.arc(px, -2.8, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ─────────────────────────────────────────────
// WAKIZASHI — Wide metallic blade with wrapped handle (Reference Image 2)
// ─────────────────────────────────────────────
function drawWakizashi(ctx, offset, scale, auraColor) {
  ctx.save();
  ctx.translate(offset, 0);
  ctx.scale(scale, scale);

  // ── Pommel (kashira) ──
  ctx.fillStyle = '#1a1a1a';
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(-14, 0, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // ── Handle with cross-hatch wrapping (tsuka-ito) ──
  ctx.fillStyle = '#111';
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-12, -2, 14, 4, 1);
  ctx.fill();
  ctx.stroke();

  // Cross-hatch wrap pattern
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 0.6;
  for (let i = 0; i < 6; i++) {
    const wx = -10 + i * 2.0;
    ctx.beginPath();
    ctx.moveTo(wx, -2);
    ctx.lineTo(wx + 1.5, 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wx + 1.5, -2);
    ctx.lineTo(wx, 2);
    ctx.stroke();
  }

  // ── Tsuba (simple rectangular guard) ──
  ctx.fillStyle = '#8a7a50';
  ctx.strokeStyle = '#6b5c3a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(0, -4.5, 3, 9, 1);
  ctx.fill();
  ctx.stroke();

  // ── Habaki (blade collar) ──
  ctx.fillStyle = '#b0a070';
  ctx.fillRect(3, -4.5, 3, 9);

  // ── Blade (wider, metallic sheen) ──
  ctx.beginPath();
  ctx.moveTo(6, -4.5);
  // Spine curve
  ctx.bezierCurveTo(20, -5, 40, -7.5, 54, -5);
  // Tip point
  ctx.lineTo(58, -0.5);
  // Edge curve
  ctx.bezierCurveTo(40, 3.5, 20, 4.5, 6, 4.5);
  ctx.closePath();

  // Metallic steel gradient (darker gunmetal for better contrast against white)
  const bladeGrad = ctx.createLinearGradient(6, -6, 6, 5);
  bladeGrad.addColorStop(0, '#66666e');
  bladeGrad.addColorStop(0.3, '#99999f');
  bladeGrad.addColorStop(0.5, '#55555a');
  bladeGrad.addColorStop(0.7, '#88888e');
  bladeGrad.addColorStop(1, '#333338');
  ctx.fillStyle = bladeGrad;
  ctx.fill();

  // Strong dark outline for visibility
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // ── Shinogi (ridge line) ──
  ctx.beginPath();
  ctx.moveTo(6, -1);
  ctx.bezierCurveTo(20, -2, 40, -3, 54, -2.5);
  ctx.strokeStyle = '#bbb';
  ctx.lineWidth = 0.6;
  ctx.stroke();

  // ── Hamon (temper line — wavy pattern near the edge) ──
  ctx.beginPath();
  ctx.moveTo(6, 2.5);
  ctx.quadraticCurveTo(15, 1, 25, 2.5);
  ctx.quadraticCurveTo(35, 4, 45, 1.5);
  ctx.quadraticCurveTo(50, 0, 56, 0);
  ctx.strokeStyle = 'rgba(200, 200, 210, 0.5)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // ── Glowing edge aura ──
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  ctx.beginPath();
  ctx.moveTo(6, 4.5);
  ctx.bezierCurveTo(20, 4.5, 40, 3.5, 58, -0.5);

  // Large faint outer bloom
  ctx.strokeStyle = auraColor;
  ctx.lineWidth = 12;
  ctx.globalAlpha = 0.15;
  ctx.stroke();

  // Medium outer glow
  ctx.lineWidth = 6;
  ctx.globalAlpha = 0.4;
  ctx.stroke();

  // Intense inner core glow
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 1.0;
  ctx.stroke();

  // Pure white center line
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.0;
  ctx.stroke();
  
  ctx.restore();

  ctx.restore();
}

// ─────────────────────────────────────────────
// SAYA (SHEATHS) — For Nōtō (sheathing idle animation)
// ─────────────────────────────────────────────
export function drawMusashiSheaths(ctx, fighter, hasSwords) {
  ctx.save();
  ctx.translate(fighter.x, fighter.y);
  ctx.rotate(fighter.gunAngle); // Align with the direction he is looking

  // ── Wakizashi Sheath (Shorter, worn closer to waist) ──
  ctx.save();
  ctx.translate(-8, 6); // Moved closer to body
  ctx.rotate(-Math.PI / 7); // Angled slightly up

  // Sheath body
  ctx.fillStyle = '#111';
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -3.5);
  ctx.quadraticCurveTo(-15, -6, -32, -3); // shorter length
  ctx.lineTo(-34, 1);
  ctx.quadraticCurveTo(-15, 3.5, 0, 3.5);
  ctx.fill();
  ctx.stroke();

  // Sageo (decorative cord)
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  for(let i = 0; i < 3; i++) {
     ctx.beginPath();
     ctx.moveTo(-8 - i*3, -4.5);
     ctx.lineTo(-10 - i*3, 3.5);
     ctx.stroke();
  }

  // Handle sticking out (if sheathed)
  if (hasSwords) {
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.roundRect(0, -2, 12, 4, 1);
    ctx.fill();
    ctx.stroke();
    // Kashira (pommel)
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(13, 0, 2, 0, Math.PI*2);
    ctx.fill();
    // Tsuba (guard)
    ctx.fillStyle = '#8a7a50';
    ctx.fillRect(0, -4.5, 2, 9);
  }
  ctx.restore();

  // ── Katana Sheath (Longer, sweeping curve) ──
  ctx.save();
  ctx.translate(-10, -4); // Moved closer to body
  ctx.rotate(Math.PI / 8); // Angled down

  // Sheath body
  ctx.fillStyle = '#080808';
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -3.5);
  ctx.bezierCurveTo(-20, -3.5, -45, -1.5, -60, 1); // shorter length
  ctx.lineTo(-61, 4.5);
  ctx.bezierCurveTo(-45, 5, -20, 4.5, 0, 3.5);
  ctx.fill();
  ctx.stroke();

  // Sageo (decorative cord)
  ctx.strokeStyle = '#333';
  for(let i = 0; i < 4; i++) {
     ctx.beginPath();
     ctx.moveTo(-12 - i*4, -3.5);
     ctx.lineTo(-15 - i*4, 4);
     ctx.stroke();
  }

  // ── Hanging Chains (Kusari) ──
  
  // We want the chains to trail away from the movement direction.
  let chainVx = -(fighter.vx || 0) * 1.5;
  let chainVy = 5 - (fighter.vy || 0) * 1.5; // 5 represents gravity pulling down
  
  // The target angle the chain "wants" to hang at based on gravity and movement
  let targetAngle = Math.atan2(chainVy, chainVx);
  
  // Initialize independent physics arrays for each chain if they don't exist
  if (!fighter.chainAngles) fighter.chainAngles = [targetAngle, targetAngle];
  if (!fighter.chainVelocities) fighter.chainVelocities = [0, 0];
  
  // 30 FPS physics limiter for stylized movement
  const now = performance.now();
  if (fighter.lastChainUpdate === undefined) fighter.lastChainUpdate = now;
  const updatePhysics = (now - fighter.lastChainUpdate) >= (1000 / 30);
  if (updatePhysics) {
    fighter.lastChainUpdate = now;
  }

  // Two chains dangling from different points on the sheath
  const chainConfigs = [
    // Different lengths, attachments, and adjusted physics constants for 30 FPS timestep
    { attachX: -18, numLinks: 6, charmColor: '#ff4500', stiffness: 0.1, damping: 0.88 }, 
    { attachX: -26, numLinks: 8, charmColor: '#ff4500', stiffness: 0.07, damping: 0.92 }  
  ];
  
  for (let c = 0; c < chainConfigs.length; c++) {
    const config = chainConfigs[c];
    
    if (updatePhysics) {
      // Per-chain pendulum physics calculation
      let diff = targetAngle - fighter.chainAngles[c];
      diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // Normalize to -PI to PI
      
      // Each chain swings at a different frequency because of unique stiffness and damping
      fighter.chainVelocities[c] += diff * config.stiffness; 
      fighter.chainVelocities[c] *= config.damping; 
      fighter.chainAngles[c] += fighter.chainVelocities[c];
    }
    
    ctx.save();
    // Move to the attachment point on the sheath
    ctx.translate(config.attachX, 4.5);
    
    // Revert the local rotation so that 0 is Right and Math.PI/2 is Down on the screen
    ctx.rotate(-fighter.gunAngle - Math.PI / 8);
    
    // Rotate so the Y-axis points along the chain
    // Removed the artificial angle offset since true independent physics handles variation naturally
    ctx.rotate(fighter.chainAngles[c] - Math.PI / 2);
    
    ctx.strokeStyle = '#a0a0aa'; // Bright silver
    ctx.lineWidth = 1.5;
    
    for (let i = 0; i < config.numLinks; i++) {
      ctx.beginPath();
      const linkY = i * 4;
      
      // Flexible bending: the tip lags behind the swing creating a natural curve.
      const bendProgress = i / config.numLinks;
      const flexLag = Math.pow(bendProgress, 1.5) * (fighter.chainVelocities[c] * -35);
      
      // Extremely subtle wave so the chain constantly looks alive and fluid
      // Use lastChainUpdate instead of performance.now() to lock the animation to 30 FPS
      const ambientWave = Math.sin(fighter.lastChainUpdate * 0.002 - i * 0.4 + c * 2.5) * 0.8;
      const linkX = flexLag + ambientWave;
      
      // Alternate ellipses to simulate 3D chain links
      if (i % 2 === 0) {
        ctx.ellipse(linkX, linkY, 1.5, 2.5, 0, 0, Math.PI * 2);
      } else {
        ctx.ellipse(linkX, linkY, 2.5, 1.0, 0, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
    
    // Small weight/charm at the end of the chain
    const tipFlex = Math.pow(1, 1.5) * (fighter.chainVelocities[c] * -35);
    const tipWave = Math.sin(fighter.lastChainUpdate * 0.002 - config.numLinks * 0.4 + c * 2.5) * 0.8;
    const tipX = tipFlex + tipWave;

    ctx.fillStyle = config.charmColor;
    ctx.beginPath();
    ctx.arc(tipX, config.numLinks * 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.restore();
  }

  // Handle sticking out (if sheathed)
  if (hasSwords) {
    ctx.fillStyle = '#0d0d0d';
    ctx.beginPath();
    ctx.roundRect(0, -2.5, 16, 5, 1);
    ctx.fill();
    ctx.stroke();
    // Kashira (pommel)
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.roundRect(16, -3, 3, 6, 1);
    ctx.fill();
    // Tsuba (guard)
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(-1, -6, 3, 12);
  }
  ctx.restore();

  ctx.restore();
}
