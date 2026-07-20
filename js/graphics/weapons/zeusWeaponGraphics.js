// zeusWeaponGraphics.js — The Master Bolt
// A double-pointed, jagged crystal spear of pure lightning energy.

export function drawThunderboltShape(ctx, scale = 1, pulse = 1) {
  ctx.save();
  ctx.scale(scale, scale);
  
  // ═══════════════════════════════════════════════
  // 1. THE BOLT SPINE (jagged core path)
  // ═══════════════════════════════════════════════
  const spine = [
    { x: -40, y: 0 },     // rear tip
    { x: -26, y: -6 },    // rear bend 1
    { x: -12, y: 4 },     // rear bend 2
    { x: 0,   y: 0 },     // grip center
    { x: 14,  y: -5 },    // front bend 1
    { x: 28,  y: 4 },     // front bend 2
    { x: 44,  y: -3 },    // front bend 3
    { x: 60,  y: 0 },     // front tip
  ];

  // ═══════════════════════════════════════════════
  // 2. DIAMOND / SPINDLE SILHOUETTE (3D volume)
  // ═══════════════════════════════════════════════
  const totalLen = spine.length;
  const halfIdx = (totalLen - 1) / 2; // index of max thickness

  function getThickness(i) {
    if (i === 0 || i === totalLen - 1) return 0; // Sharp triangle tips
    const dist = Math.abs(i - halfIdx) / halfIdx; 
    const taper = 1 - Math.pow(dist, 0.7);
    return 1.5 + taper * 6.5; // Slightly adjusted to maintain body thickness
  }

  const upperEdge = spine.map((p, i) => ({ x: p.x, y: p.y - getThickness(i) }));
  const lowerEdge = spine.map((p, i) => ({ x: p.x, y: p.y + getThickness(i) })).reverse();

  // ─── Dark outline for contrast on light backgrounds ───
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(upperEdge[0].x, upperEdge[0].y);
  for (let i = 1; i < upperEdge.length; i++) ctx.lineTo(upperEdge[i].x, upperEdge[i].y);
  for (let i = 0; i < lowerEdge.length; i++) ctx.lineTo(lowerEdge[i].x, lowerEdge[i].y);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(0, 85, 170, 0.3)'; // Less visible blue edge
  ctx.lineWidth = 2; // Thinner stroke
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();

  // ─── Outer glow layer (electric blue bloom) ───
  ctx.save();
  ctx.shadowColor = 'rgba(0, 191, 255, 0.5)';
  ctx.shadowBlur = 15 * pulse; // Reduced blur intensity

  ctx.beginPath();
  ctx.moveTo(upperEdge[0].x, upperEdge[0].y);
  for (let i = 1; i < upperEdge.length; i++) ctx.lineTo(upperEdge[i].x, upperEdge[i].y);
  for (let i = 0; i < lowerEdge.length; i++) ctx.lineTo(lowerEdge[i].x, lowerEdge[i].y);
  ctx.closePath();

  const outerGrad = ctx.createLinearGradient(spine[0].x, 0, spine[spine.length - 1].x, 0);
  outerGrad.addColorStop(0, 'rgba(0, 140, 255, 0.0)');
  outerGrad.addColorStop(0.15, 'rgba(0, 191, 255, 0.3)'); // Reduced opacity
  outerGrad.addColorStop(0.5, 'rgba(100, 220, 255, 0.5)'); // Reduced opacity
  outerGrad.addColorStop(0.85, 'rgba(0, 191, 255, 0.3)'); // Reduced opacity
  outerGrad.addColorStop(1, 'rgba(0, 140, 255, 0.0)');
  ctx.fillStyle = outerGrad;
  ctx.fill();
  ctx.restore();

  // ─── Inner core layer (white-hot center) ───
  const innerScale = 0.55;
  const innerUpper = spine.map((p, i) => ({ x: p.x, y: p.y - getThickness(i) * innerScale }));
  const innerLower = spine.map((p, i) => ({ x: p.x, y: p.y + getThickness(i) * innerScale })).reverse();

  ctx.save();
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 8;

  ctx.beginPath();
  ctx.moveTo(innerUpper[0].x, innerUpper[0].y);
  for (let i = 1; i < innerUpper.length; i++) ctx.lineTo(innerUpper[i].x, innerUpper[i].y);
  for (let i = 0; i < innerLower.length; i++) ctx.lineTo(innerLower[i].x, innerLower[i].y);
  ctx.closePath();

  const coreGrad = ctx.createLinearGradient(spine[0].x, 0, spine[spine.length - 1].x, 0);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.0)');
  coreGrad.addColorStop(0.2, 'rgba(255, 255, 255, 0.95)');
  coreGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
  coreGrad.addColorStop(0.8, 'rgba(255, 255, 255, 0.95)');
  coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = coreGrad;
  ctx.fill();
  ctx.restore();
  
  // ─── Hard chiseled facet highlights (angular reflections on the crystal) ───
  ctx.save();
  ctx.globalAlpha = 0.35;
  for (let i = 1; i < spine.length - 1; i++) {
    const t = getThickness(i) * 0.8;
    ctx.beginPath();
    ctx.moveTo(spine[i].x, spine[i].y - t);
    ctx.lineTo(spine[i].x + 4, spine[i].y);
    ctx.lineTo(spine[i].x, spine[i].y + t * 0.3);
    ctx.closePath();
    ctx.fillStyle = 'rgba(200, 240, 255, 0.6)';
    ctx.fill();
  }
  ctx.restore();

  // ─── Sharp outline stroke (bolt boundary) ───
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(upperEdge[0].x, upperEdge[0].y);
  for (let i = 1; i < upperEdge.length; i++) ctx.lineTo(upperEdge[i].x, upperEdge[i].y);
  for (let i = 0; i < lowerEdge.length; i++) ctx.lineTo(lowerEdge[i].x, lowerEdge[i].y);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(0, 191, 255, 0.6)';
  ctx.lineWidth = 1;
  ctx.lineJoin = 'bevel';
  ctx.stroke();
  ctx.restore();

  // ═══════════════════════════════════════════════
  // 3. ERRATIC ENERGY — Branching arcs & sparks
  // ═══════════════════════════════════════════════
  const now = Date.now();
  
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const branchCount = 4;
  for (let b = 0; b < branchCount; b++) {
    const seed = Math.floor(now / 80) * 137 + b * 53;
    const pseudoRand = (n) => {
      const x = Math.sin(seed + n * 9.1) * 43758.5453;
      return x - Math.floor(x);
    };

    const anchorIdx = 1 + Math.floor(pseudoRand(0) * (spine.length - 2));
    const anchor = spine[anchorIdx];

    const dirX = -1 + pseudoRand(1) * 0.6;
    const dirY = (pseudoRand(2) - 0.5) * 2;

    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);

    let bx = anchor.x;
    let by = anchor.y;
    const segments = 2 + Math.floor(pseudoRand(3) * 2);
    const branchLen = 8 + pseudoRand(4) * 14;

    for (let s = 0; s < segments; s++) {
      bx += dirX * (branchLen / segments) + (pseudoRand(5 + s) - 0.5) * 8;
      by += dirY * (branchLen / segments) + (pseudoRand(6 + s) - 0.5) * 10;
      ctx.lineTo(bx, by);
    }

    ctx.strokeStyle = `rgba(0, 220, 255, ${0.4 + pseudoRand(7) * 0.4})`;
    ctx.lineWidth = 0.8 + pseudoRand(8) * 1.2;
    ctx.shadowColor = '#00BFFF';
    ctx.shadowBlur = 6;
    ctx.stroke();
  }
  ctx.restore();
  
  // Grounding sparks: tiny detached dots floating near the bolt
  ctx.save();
  const sparkCount = 6;
  for (let s = 0; s < sparkCount; s++) {
    const seed = Math.floor(now / 60) * 97 + s * 71;
    const pr = (n) => {
      const v = Math.sin(seed + n * 7.3) * 43758.5453;
      return v - Math.floor(v);
    };

    // Position near the bolt body
    const si = Math.floor(pr(0) * spine.length);
    const sp = spine[Math.min(si, spine.length - 1)];
    const sx = sp.x + (pr(1) - 0.5) * 20;
    const sy = sp.y + (pr(2) - 0.5) * 20;
    const sz = 1 + pr(3) * 2;

    ctx.beginPath();
    ctx.arc(sx, sy, sz, 0, Math.PI * 2);
    ctx.fillStyle = pr(4) > 0.5 ? '#FFFFFF' : '#00FFFF';
    ctx.shadowColor = '#00BFFF';
    ctx.shadowBlur = 6;
    ctx.fill();
  }
  ctx.restore();

  ctx.restore(); // Restore initial scale and translation
}

export function drawZeusWeapon(ctx, x, y, gunAngle, r, auraPhase, attackProgress = 1, fighterColor = '#102040', isChannelingStorm = false, chargeProgress = 0) {
  ctx.save();
  ctx.translate(x, y);

  const now = Date.now();
  const pulse = 0.85 + Math.sin(now * 0.008) * 0.15;

  if (isChannelingStorm) {
    // 1. Draw lightning bolt flying up to the sky
    const throwProgress = Math.min(1, chargeProgress * 3); // 0 to 1 quickly
    if (chargeProgress < 1.0) { 
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1.0 - Math.pow(throwProgress, 2));
        
        const flyY = -throwProgress * 500;
        
        // Draw glowing lightning trail
        if (throwProgress > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            
            // Dynamic snappy crackling electric worms
            const numWorms = 4;
            for (let i = 0; i < numWorms; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                
                let curY = 0;
                const segments = 5 + Math.floor(Math.random() * 4);
                const segLen = flyY / segments;
                
                for (let s = 1; s <= segments; s++) {
                    const t = s / segments;
                    let nextY = segLen * s;
                    // Violent jitter horizontally (thickest in the middle)
                    let nextX = (Math.random() - 0.5) * 70 * Math.sin(t * Math.PI);
                    if (s === segments) {
                        nextX = 0; // Connect to the bolt tip
                        nextY = flyY;
                    }
                    ctx.lineTo(nextX, nextY);
                    curY = nextY;
                }
                
                // Randomly color the worm cyan or white
                if (Math.random() > 0.3) {
                    ctx.strokeStyle = `rgba(0, 220, 255, ${0.4 + Math.random() * 0.4})`;
                    ctx.lineWidth = 4 + Math.random() * 8;
                } else {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + Math.random() * 0.4})`;
                    ctx.lineWidth = 2 + Math.random() * 3;
                }
                ctx.lineJoin = 'round';
                ctx.stroke();
            }
            ctx.restore();
        }

        ctx.translate(0, flyY); // Fly straight up screen
        ctx.rotate(-Math.PI/2); // Point straight up
        drawThunderboltShape(ctx, 1.0, pulse);
        ctx.restore();
    }
    
    // 2. Draw two hands raised "on top of head" (in front of him)
    ctx.rotate(gunAngle);
    
    // Hands raise up and shake powerfully over the top edge of his body
    const shakeAmount = chargeProgress * 3;
    const shakeX = (Math.random() * shakeAmount - shakeAmount/2);
    const shakeY = (Math.random() * shakeAmount - shakeAmount/2);
    
    // Position arms outstretched (one in front, one behind for side-view)
    const handRadiusOffset = r - 2; // Slightly inside the edge so they anchor
    const leftX = handRadiusOffset * Math.cos(Math.PI) + shakeX; // Back hand
    const leftY = handRadiusOffset * Math.sin(Math.PI) + shakeY;
    const rightX = handRadiusOffset * Math.cos(0) + shakeX;      // Front hand
    const rightY = handRadiusOffset * Math.sin(0) + shakeY;
    
    ctx.fillStyle = fighterColor;
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    
    // Left hand
    ctx.beginPath();
    ctx.arc(leftX, leftY, 6.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    
    // Right hand
    ctx.beginPath();
    ctx.arc(rightX, rightY, 6.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    
    ctx.restore();
    return; // Skip normal weapon drawing
  }

  ctx.rotate(gunAngle);

  if (Math.abs(gunAngle) > Math.PI / 2) {
    ctx.scale(1, -1);
  }
  
  let weaponPullback = 0;
  let weaponAngle = 0;
  let weaponSideOffset = 0;
  
  const alignToSpearAngle = Math.PI / 4;

  if (attackProgress >= 0.5) {
    const p = (attackProgress - 0.5) / 0.5;
    const ease = p * p * p;
    weaponPullback = -18 * ease;
    weaponSideOffset = -22 * ease;
    weaponAngle = (alignToSpearAngle + 0.1) * ease;
  } else if (attackProgress < 0.3) {
    const p = 1 - (attackProgress / 0.3);
    weaponPullback = 20 * Math.pow(p, 3);
    weaponSideOffset = 0;
    weaponAngle = alignToSpearAngle * Math.pow(p, 3);
  }

  const holdDistX = r + 4 + weaponPullback;
  const holdDistY = weaponSideOffset;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const bodyGlow = ctx.createRadialGradient(holdDistX - 8, holdDistY, 0, 0, 0, r + 5);
  bodyGlow.addColorStop(0, `rgba(50, 180, 255, ${0.3 * pulse})`);
  bodyGlow.addColorStop(0.6, `rgba(0, 100, 200, ${0.1 * pulse})`);
  bodyGlow.addColorStop(1, 'rgba(0, 50, 100, 0)');
  ctx.fillStyle = bodyGlow;
  ctx.beginPath();
  ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.translate(holdDistX, holdDistY);
  ctx.rotate(-Math.PI / 4 + weaponAngle);

  drawThunderboltShape(ctx, 1.0, pulse);

  // ═══════════════════════════════════════════════
  // 4. CAST LIGHT onto Zeus's hand/body
  // ═══════════════════════════════════════════════

  // Glow on the grip area (simulating light cast onto his hand)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  // We are at the hand already, so center is 0,0
  const handGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
  handGlow.addColorStop(0, `rgba(100, 200, 255, ${0.5 * pulse})`);
  handGlow.addColorStop(0.5, `rgba(0, 150, 255, ${0.25 * pulse})`);
  handGlow.addColorStop(1, 'rgba(0, 100, 200, 0)');
  ctx.fillStyle = handGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ═══════════════════════════════════════════════
  // GRIP HAND (drawn on top of bolt)
  // ═══════════════════════════════════════════════
  ctx.save();
  ctx.rotate(Math.PI / 4); // Undo the diagonal rotation
  ctx.fillStyle = fighterColor; // Match fighter color
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.5;
  
  // Main grip hand
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}
