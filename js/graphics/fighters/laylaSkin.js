import { CONFIG } from '../../core/config.js';



// Helper: Direct goggle rendering code (drawn once per radius size to offscreen canvas)
function renderLaylaGogglesDirect(ctx, r) {
  const goggleWidth = r * 1.2;
  const goggleHeight = r * 0.4;
  const lensRadius = r * 0.35;
  const strapWidth = r * 0.4;

  const goldColor = '#E5BA73'; // Vibrant Gold
  const darkGold = '#9E7437'; // Darker Brass/Gold

  // Goggle strap (headband)
  ctx.fillStyle = darkGold;
  ctx.fillRect(-goggleWidth / 2, -goggleHeight / 2, goggleWidth, goggleHeight);
  
  // Strap highlight
  ctx.fillStyle = goldColor;
  ctx.fillRect(-goggleWidth / 2, -goggleHeight / 2, goggleWidth, goggleHeight * 0.3);

  // Both lenses in one batched fill pass
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  ctx.arc(-goggleWidth / 4, 0, lensRadius, 0, Math.PI * 2);
  ctx.arc(goggleWidth / 4, 0, lensRadius, 0, Math.PI * 2);
  ctx.fill();

  // Both lens main rims in one batched stroke pass
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(-goggleWidth / 4, 0, lensRadius, 0, Math.PI * 2);
  ctx.arc(goggleWidth / 4, 0, lensRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Both lens inner rims in one batched stroke pass
  ctx.strokeStyle = darkGold;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(-goggleWidth / 4, 0, lensRadius * 0.8, 0, Math.PI * 2);
  ctx.arc(goggleWidth / 4, 0, lensRadius * 0.8, 0, Math.PI * 2);
  ctx.stroke();

  // Connecting bridge between lenses
  ctx.fillStyle = goldColor;
  ctx.fillRect(-goggleWidth / 8, -strapWidth / 2, goggleWidth / 4, strapWidth);
  
  // Bridge rivets — batched
  ctx.fillStyle = darkGold;
  ctx.beginPath();
  ctx.arc(-goggleWidth / 16, 0, 2, 0, Math.PI * 2);
  ctx.arc(goggleWidth / 16, 0, 2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawLaylaAfterImages(ctx, fighter) {
  if (!fighter.afterImages || fighter.afterImages.length === 0) return;
  const r = fighter.r;
  
  ctx.save();
  // We use lighter composite operation for energetic look
  ctx.globalCompositeOperation = 'screen';
  
  for (let i = 0; i < fighter.afterImages.length; i++) {
    const ai = fighter.afterImages[i];
    const alpha = Math.max(0, ai.timer / ai.maxTimer) * 0.45; // Max 45% opacity
    
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ai.color || '#00E5FF';
    
    // Draw body silhouette
    ctx.beginPath();
    ctx.arc(ai.x, ai.y, r, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw slight glow/bloom
    ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath();
    ctx.arc(ai.x, ai.y, r * 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.restore();
}

export function drawLaylaGoggles(ctx, fighter) {
  const r = fighter.r;
  const goggleY = fighter.y - r * 0.8; // Position above the head
  const size = Math.ceil(r * 1.5) * 2;

  if (!fighter._gogglesCanvas || fighter._gogglesCanvas.width !== size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const cctx = canvas.getContext('2d');
    cctx.translate(size / 2, size / 2);
    renderLaylaGogglesDirect(cctx, r);
    fighter._gogglesCanvas = canvas;
  }

  ctx.save();
  ctx.translate(fighter.x, goggleY);
  ctx.drawImage(fighter._gogglesCanvas, -size / 2, -size / 2);
  ctx.restore();
}

export function drawLaylaPigtails(ctx, fighter) {
  const r = fighter.r;
  const hairColor = '#FFE082'; // Soft golden blonde
  const hairDarkColor = '#C9A065'; // Shadow bronze/blonde
  const hairHighlightColor = '#FFF9C4'; // Pale highlight blonde
  const tieColor = '#5D4037'; // Brown leather hair tie
  const tieGold = '#E5BA73'; // Gold trim on tie
  
  const pigtailLength = r * 2.9;
  const time = Date.now() * 0.003; // Animation timing

  // Physics Wind-Drag calculation based on velocity
  const vx = fighter.vx || 0;
  const vy = fighter.vy || 0;
  
  // Cap the velocity used for physics calculation to prevent extreme stretching
  const maxVel = 8;
  const speed = Math.hypot(vx, vy);
  let scaleFactor = 1.6;
  if (speed > maxVel) {
    scaleFactor = (maxVel / speed) * 1.6;
  }

  // Calculate extra pigtail kickback swing when firing
  const recoilDist = (fighter.gunRecoil || 0) * 12;
  const recoilX = -Math.cos(fighter.gunAngle || 0) * recoilDist;
  const recoilY = -Math.sin(fighter.gunAngle || 0) * recoilDist;

  const lagX = -vx * scaleFactor - Math.cos(fighter.gunAngle || 0) * ((fighter.gunRecoil || 0) * 18);
  const lagY = -vy * scaleFactor - Math.sin(fighter.gunAngle || 0) * ((fighter.gunRecoil || 0) * 18);

  ctx.save();
  // Translate to fighter center, adjusting for physical body recoil kickback
  ctx.translate(fighter.x + recoilX, fighter.y + recoilY);

  // Precompute wave values (reused across left and right pigtails)
  const wave1 = Math.sin(time + 0) * 4;
  const wave2 = Math.sin(time + 1.2) * 6;
  const wave3 = Math.sin(time + 2.4) * 5;
  const wave1r = Math.sin(time + 0.6) * 4;
  const wave2r = Math.sin(time + 1.8) * 6;
  const wave3r = Math.sin(time + 3.0) * 5;

  // =========================================================
  // --- 1. LEFT PIGTAIL (Back pigtail, attaches on left head) ---
  // =========================================================
  ctx.save();
  ctx.translate(-r * 0.75, -r * 0.35); // Attaching point on head
  ctx.scale(0.85, 0.85); // Make hair slightly smaller

  // Draw Hair Tie — both fill rects in one save block
  ctx.fillStyle = tieColor;
  ctx.fillRect(-r * 0.15, -r * 0.1, r * 0.3, r * 0.2);
  ctx.fillStyle = tieGold;
  ctx.fillRect(-r * 0.15, -r * 0.03, r * 0.3, r * 0.06);

  // Tie rivet detail
  ctx.fillStyle = tieGold;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#27120B';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw Main Pigtail Body (Wavy S-shape with drag physics)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  
  // Arch up and out (left side) - Drag applied
  ctx.bezierCurveTo(
    -r * 0.65 + lagX * 0.2, -r * 1.1 + lagY * 0.2, 
    -r * 1.35 + wave1 + lagX * 0.5, -r * 0.2 + lagY * 0.5, 
    -r * 1.35 + wave1 + lagX * 0.6, r * 0.6 + lagY * 0.6
  );
  
  // Outer wave down to form first spiky tip (Tip 1, side lock) - Drag applied
  ctx.quadraticCurveTo(
    -r * 1.35 + wave1 + lagX * 0.75, r * 1.4 + lagY * 0.75, 
    -r * 1.55 + wave2 + lagX * 0.95, r * 1.7 + lagY * 0.95
  );
  
  // Return inwards to form the spike notch - Drag applied
  ctx.lineTo(-r * 1.15 + wave2 + lagX * 0.8, r * 1.6 + lagY * 0.8);
  
  // Main bottom lock (Tip 2, central tip) curving down - Drag applied
  ctx.quadraticCurveTo(
    -r * 1.3 + wave2 + lagX * 0.85, r * 2.2 + lagY * 0.85, 
    -r * 0.95 + wave2 + lagX, pigtailLength + lagY
  );
  
  // Bottom-most curved tip - Drag applied
  ctx.quadraticCurveTo(
    -r * 0.8 + wave2 + lagX * 0.95, pigtailLength + r * 0.1 + lagY * 1.05, 
    -r * 0.65 + wave2 + lagX * 0.95, pigtailLength - r * 0.2 + lagY * 0.95
  );
  
  // Third inner lock (Tip 3, inner side lock) - Drag applied
  ctx.lineTo(-r * 0.55 + wave3 + lagX * 0.9, pigtailLength - r * 0.1 + lagY * 0.9);
  
  // Inner boundary returning to head (forming beautiful S-curve hollow) - Drag applied
  ctx.bezierCurveTo(
    -r * 0.35 + wave3 + lagX * 0.6, r * 1.5 + lagY * 0.6, 
    -r * 0.3 + lagX * 0.3, r * 0.4 + lagY * 0.3, 
    0, r * 0.15
  );
  ctx.closePath();

  // Flat color fill instead of per-frame gradient (major perf saving)
  ctx.fillStyle = '#E8A852';
  ctx.fill();

  // Outline
  ctx.strokeStyle = '#27120B';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Highlight Strand overlay with matching curves and drag (simplified)
  ctx.fillStyle = hairHighlightColor;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(-r * 0.05, -r * 0.05);
  ctx.bezierCurveTo(
    -r * 0.5 + lagX * 0.2, -r * 0.9 + lagY * 0.2, 
    -r * 1.15 + wave1 + lagX * 0.5, r * 0.3 + lagY * 0.5, 
    -r * 1.15 + wave1 + lagX * 0.6, r * 0.8 + lagY * 0.6
  );
  ctx.quadraticCurveTo(
    -r * 1.15 + wave1 + lagX * 0.7, r * 1.3 + lagY * 0.7, 
    -r * 1.35 + wave2 + lagX * 0.95, r * 1.65 + lagY * 0.95
  );
  ctx.lineTo(-r * 1.1 + wave2 + lagX * 0.8, r * 1.55 + lagY * 0.8);
  ctx.quadraticCurveTo(
    -r * 1.25 + wave2 + lagX * 0.85, r * 2.0 + lagY * 0.85, 
    -r * 0.9 + wave2 + lagX * 0.95, pigtailLength - r * 0.35 + lagY * 0.95
  );
  ctx.bezierCurveTo(
    -r * 0.75 + wave1 + lagX * 0.5, r * 0.3 + lagY * 0.5, 
    -r * 0.2 + lagX * 0.2, -r * 0.4 + lagY * 0.2, 
    0, 0
  );
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Hair strand detail lines — all 3 strands in ONE batched stroke call
  ctx.strokeStyle = '#E5BA73';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  // Strand 1
  ctx.moveTo(0, -r * 0.02);
  ctx.bezierCurveTo(
    -r * 0.45 + lagX * 0.2, -r * 0.8 + lagY * 0.2, 
    -r * 1.15 + wave1 + lagX * 0.5, r * 0.2 + lagY * 0.5, 
    -r * 1.15 + wave1 + lagX * 0.6, r * 0.9 + lagY * 0.6
  );
  ctx.quadraticCurveTo(
    -r * 1.15 + wave1 + lagX * 0.7, r * 1.3 + lagY * 0.7, 
    -r * 1.45 + wave2 + lagX * 0.95, r * 1.65 + lagY * 0.95
  );
  // Strand 2
  ctx.moveTo(-r * 0.05, r * 0.05);
  ctx.bezierCurveTo(
    -r * 0.35 + lagX * 0.2, -r * 0.5 + lagY * 0.2, 
    -r * 0.95 + wave3 + lagX * 0.5, r * 0.5 + lagY * 0.5, 
    -r * 0.95 + wave2 + lagX * 0.8, pigtailLength - r * 0.45 + lagY * 0.8
  );
  // Strand 3
  ctx.moveTo(-r * 0.02, r * 0.08);
  ctx.bezierCurveTo(
    -r * 0.2 + lagX * 0.2, -r * 0.15 + lagY * 0.2, 
    -r * 0.55 + wave3 + lagX * 0.5, r * 0.7 + lagY * 0.5, 
    -r * 0.5 + wave3 + lagX * 0.8, pigtailLength - r * 0.6 + lagY * 0.8
  );
  ctx.stroke(); // Single batched stroke call for all 3 strands

  ctx.restore();

  // =========================================================
  // --- 2. RIGHT PIGTAIL (Front pigtail, attaches on right head) ---
  // =========================================================
  ctx.save();
  ctx.translate(r * 0.75, -r * 0.35); // Attaching point on head
  ctx.scale(0.85, 0.85); // Make hair slightly smaller

  // Draw Hair Tie
  ctx.fillStyle = tieColor;
  ctx.fillRect(-r * 0.15, -r * 0.1, r * 0.3, r * 0.2);
  ctx.fillStyle = tieGold;
  ctx.fillRect(-r * 0.15, -r * 0.03, r * 0.3, r * 0.06);

  // Tie rivet detail
  ctx.fillStyle = tieGold;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#27120B';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw Main Pigtail Body (Wavy S-shape with drag physics)
  ctx.beginPath();
  ctx.moveTo(0, 0);
  
  // Arch up and out (right side) - Drag applied
  ctx.bezierCurveTo(
    r * 0.65 + lagX * 0.2, -r * 1.1 + lagY * 0.2, 
    r * 1.35 + wave1r + lagX * 0.5, -r * 0.2 + lagY * 0.5, 
    r * 1.35 + wave1r + lagX * 0.6, r * 0.6 + lagY * 0.6
  );
  
  // Outer wave down to form first spiky tip (Tip 1, side lock) - Drag applied
  ctx.quadraticCurveTo(
    r * 1.35 + wave1r + lagX * 0.75, r * 1.4 + lagY * 0.75, 
    r * 1.55 + wave2r + lagX * 0.95, r * 1.7 + lagY * 0.95
  );
  
  // Return inwards to form the spike notch - Drag applied
  ctx.lineTo(r * 1.15 + wave2r + lagX * 0.8, r * 1.6 + lagY * 0.8);
  
  // Main bottom lock (Tip 2, central tip) curving down - Drag applied
  ctx.quadraticCurveTo(
    r * 1.3 + wave2r + lagX * 0.85, r * 2.2 + lagY * 0.85, 
    r * 0.95 + wave2r + lagX, pigtailLength + lagY
  );
  
  // Bottom-most curved tip - Drag applied
  ctx.quadraticCurveTo(
    r * 0.8 + wave2r + lagX * 0.95, pigtailLength + r * 0.1 + lagY * 1.05, 
    r * 0.65 + wave2r + lagX * 0.95, pigtailLength - r * 0.2 + lagY * 0.95
  );
  
  // Third inner lock (Tip 3, inner side lock) - Drag applied
  ctx.lineTo(r * 0.55 + wave3r + lagX * 0.9, pigtailLength - r * 0.1 + lagY * 0.9);
  
  // Inner boundary returning to head (forming beautiful S-curve hollow) - Drag applied
  ctx.bezierCurveTo(
    r * 0.35 + wave3r + lagX * 0.6, r * 1.5 + lagY * 0.6, 
    r * 0.3 + lagX * 0.3, r * 0.4 + lagY * 0.3, 
    0, r * 0.15
  );
  ctx.closePath();

  // Flat color fill instead of per-frame gradient
  ctx.fillStyle = '#E8A852';
  ctx.fill();

  // Outline
  ctx.strokeStyle = '#27120B';
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Highlight Strand overlay with matching curves and drag (simplified)
  ctx.fillStyle = hairHighlightColor;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(r * 0.05, -r * 0.05);
  ctx.bezierCurveTo(
    r * 0.5 + lagX * 0.2, -r * 0.9 + lagY * 0.2, 
    r * 1.15 + wave1r + lagX * 0.5, r * 0.3 + lagY * 0.5, 
    r * 1.15 + wave1r + lagX * 0.6, r * 0.8 + lagY * 0.6
  );
  ctx.quadraticCurveTo(
    r * 1.15 + wave1r + lagX * 0.7, r * 1.3 + lagY * 0.7, 
    r * 1.35 + wave2r + lagX * 0.95, r * 1.65 + lagY * 0.95
  );
  ctx.lineTo(r * 1.1 + wave2r + lagX * 0.8, r * 1.55 + lagY * 0.8);
  ctx.quadraticCurveTo(
    r * 1.25 + wave2r + lagX * 0.85, r * 2.0 + lagY * 0.85, 
    r * 0.9 + wave2r + lagX * 0.95, pigtailLength - r * 0.35 + lagY * 0.95
  );
  ctx.bezierCurveTo(
    r * 1.15 + wave1r + lagX * 0.5, r * 0.3 + lagY * 0.5, 
    r * 0.2 + lagX * 0.2, -r * 0.4 + lagY * 0.2, 
    0, 0
  );
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // Hair strand detail lines — all 3 strands in ONE batched stroke call
  ctx.strokeStyle = '#E5BA73';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  // Strand 1
  ctx.moveTo(0, -r * 0.02);
  ctx.bezierCurveTo(
    r * 0.45 + lagX * 0.2, -r * 0.9 + lagY * 0.2, 
    r * 1.15 + wave1r + lagX * 0.5, r * 0.2 + lagY * 0.5, 
    r * 1.15 + wave1r + lagX * 0.6, r * 0.9 + lagY * 0.6
  );
  ctx.quadraticCurveTo(
    r * 1.15 + wave1r + lagX * 0.7, r * 1.3 + lagY * 0.7, 
    r * 1.45 + wave2r + lagX * 0.95, r * 1.65 + lagY * 0.95
  );
  // Strand 2
  ctx.moveTo(r * 0.05, r * 0.05);
  ctx.bezierCurveTo(
    r * 0.5 + lagX * 0.2, -r * 0.6 + lagY * 0.2, 
    r * 1.4 + wave3r + lagX * 0.5, r * 0.5 + lagY * 0.5, 
    r * 1.5 + wave2r + lagX * 0.8, pigtailLength - r * 0.45 + lagY * 0.8
  );
  // Strand 3
  ctx.moveTo(r * 0.02, r * 0.08);
  ctx.bezierCurveTo(
    r * 0.3 + lagX * 0.2, -r * 0.2 + lagY * 0.2, 
    r * 0.8 + wave3r + lagX * 0.5, r * 0.7 + lagY * 0.5, 
    r * 0.75 + wave3r + lagX * 0.8, pigtailLength - r * 0.6 + lagY * 0.8
  );
  ctx.stroke(); // Single batched stroke call for all 3 strands

  ctx.restore();

  ctx.restore();
}

// Helper: Direct body rendering code (drawn once per radius size to offscreen canvas)
function renderLaylaBodyDirect(ctx, r) {
  // 1. Skin Base (warm peach/ivory)
  ctx.fillStyle = '#FFEBE0';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Draw face-framing blonde hair inside the circle (hair at the top and sides of the head)
  ctx.fillStyle = '#FFE082';
  ctx.beginPath();
  ctx.arc(0, 0, r, Math.PI, Math.PI * 2);
  ctx.fill();

  // Draw hair highlights/details inside the circle
  ctx.fillStyle = '#FFF9C4';
  ctx.beginPath();
  ctx.moveTo(-r * 0.5, -r * 0.5);
  ctx.quadraticCurveTo(-r * 0.3, -r * 0.7, 0, -r * 0.6);
  ctx.quadraticCurveTo(r * 0.3, -r * 0.7, r * 0.5, -r * 0.5);
  ctx.quadraticCurveTo(r * 0.2, -r * 0.8, 0, -r * 0.8);
  ctx.quadraticCurveTo(-r * 0.2, -r * 0.8, -r * 0.5, -r * 0.5);
  ctx.closePath();
  ctx.fill();

  // 2. White Cadet Jacket (covering shoulders and back)
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  // Left sleeve/shoulder
  ctx.moveTo(-r, -r * 0.4);
  ctx.quadraticCurveTo(-r * 0.8, -r * 0.8, -r * 0.4, -r * 0.7);
  ctx.lineTo(-r * 0.3, 0);
  ctx.lineTo(-r, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  // Right sleeve/shoulder
  ctx.moveTo(r, -r * 0.4);
  ctx.quadraticCurveTo(r * 0.8, -r * 0.8, r * 0.4, -r * 0.7);
  ctx.lineTo(r * 0.3, 0);
  ctx.lineTo(r, 0);
  ctx.closePath();
  ctx.fill();

  // Shaded back neck collar joining shoulders
  ctx.fillStyle = '#EAEAEA';
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, -r * 0.65);
  ctx.quadraticCurveTo(0, -r * 0.85, r * 0.6, -r * 0.65);
  ctx.lineTo(r * 0.4, -r * 0.5);
  ctx.quadraticCurveTo(0, -r * 0.7, -r * 0.4, -r * 0.5);
  ctx.closePath();
  ctx.fill();

  // Steampunk Gold/Brass colors (reverted from cyan)
  const goldColor = '#E5BA73';
  const darkGold = '#9E7437';
  
  // Both epaulet circles batched into one fill path
  ctx.fillStyle = goldColor;
  ctx.strokeStyle = darkGold;
  ctx.beginPath();
  ctx.arc(-r * 0.65, -r * 0.65, r * 0.18, 0, Math.PI * 2);
  ctx.arc(r * 0.65, -r * 0.65, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Gold trim on white jacket open lapels — both in one batched stroke
  ctx.strokeStyle = '#E5BA73';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.7);
  ctx.lineTo(-r * 0.25, -r * 0.2);
  ctx.lineTo(-r * 0.35, 0);
  ctx.moveTo(r * 0.4, -r * 0.7);
  ctx.lineTo(r * 0.25, -r * 0.2);
  ctx.lineTo(r * 0.35, 0);
  ctx.stroke();

  // 3. Lavender Shirt (inside chest opening) — flat fill instead of gradient
  ctx.fillStyle = '#D4A8DB';
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.7);
  ctx.lineTo(r * 0.3, -r * 0.7);
  ctx.lineTo(r * 0.25, 0);
  ctx.lineTo(-r * 0.25, 0);
  ctx.closePath();
  ctx.fill();

  // Shirt collar lapels
  ctx.fillStyle = '#CE93D8';
  ctx.beginPath();
  ctx.moveTo(-r * 0.18, -r * 0.55);
  ctx.lineTo(0, -r * 0.42);
  ctx.lineTo(r * 0.18, -r * 0.55);
  ctx.lineTo(r * 0.12, -r * 0.6);
  ctx.lineTo(-r * 0.12, -r * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#9C27B0';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 4. Dark Purple Tie
  ctx.fillStyle = '#4A148C';
  ctx.beginPath();
  ctx.moveTo(-r * 0.05, -r * 0.45);
  ctx.lineTo(r * 0.05, -r * 0.45);
  ctx.lineTo(r * 0.07, -r * 0.05);
  ctx.lineTo(0, 0);
  ctx.lineTo(-r * 0.07, -r * 0.05);
  ctx.closePath();
  ctx.fill();

  // Gold Brooch on Tie/Collar intersection
  ctx.fillStyle = '#E5BA73';
  ctx.beginPath();
  ctx.arc(0, -r * 0.45, r * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // 5. Brown Corset — flat fill instead of per-frame gradient
  ctx.fillStyle = '#4A2E22';
  ctx.fillRect(-r, 0, r * 2, r * 0.35);

  // Corset Lacing (gold X crossings) — all 4 lines in one batched stroke
  ctx.strokeStyle = '#E5BA73';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, r * 0.06);
  ctx.lineTo(r * 0.12, r * 0.16);
  ctx.moveTo(r * 0.12, r * 0.06);
  ctx.lineTo(-r * 0.12, r * 0.16);
  ctx.moveTo(-r * 0.12, r * 0.18);
  ctx.lineTo(r * 0.12, r * 0.28);
  ctx.moveTo(r * 0.12, r * 0.18);
  ctx.lineTo(-r * 0.12, r * 0.28);
  ctx.stroke();

  // Side corset shape lines — both in one batched stroke
  ctx.strokeStyle = '#27120B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, 0);
  ctx.quadraticCurveTo(-r * 0.3, r * 0.18, -r * 0.4, r * 0.35);
  ctx.moveTo(r * 0.4, 0);
  ctx.quadraticCurveTo(r * 0.3, r * 0.18, r * 0.4, r * 0.35);
  ctx.stroke();

  // Stud details on sides of corset — all 6 in one batched fill
  ctx.fillStyle = '#00E5FF';
  ctx.beginPath();
  for (const yOffset of [r * 0.06, r * 0.18, r * 0.3]) {
    ctx.arc(-r * 0.32, yOffset, 1.2, 0, Math.PI * 2);
    ctx.arc(r * 0.32, yOffset, 1.2, 0, Math.PI * 2);
  }
  ctx.fill();

  // 6. Dark Cyan Tech Skirt — flat fill instead of per-frame gradient
  ctx.fillStyle = '#004A4E';
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.35);
  ctx.lineTo(r, r * 0.35);
  ctx.lineTo(r, r);
  ctx.lineTo(-r, r);
  ctx.closePath();
  ctx.fill();

  // Skirt pleat lines — all batched into ONE stroke call
  ctx.strokeStyle = '#001A1C';
  ctx.lineWidth = 1.8;
  const pleatsCount = 6; // Reduced from 8 for performance
  ctx.beginPath();
  for (let i = 1; i < pleatsCount; i++) {
    const ratio = i / pleatsCount;
    const xTop = -r + r * 2 * ratio;
    const xBottom = -r * 1.05 + r * 2.1 * ratio;
    ctx.moveTo(xTop, r * 0.35);
    ctx.lineTo(xBottom, r);
  }
  ctx.stroke();

  // Cyan trim line at skirt hem
  ctx.strokeStyle = '#00E5FF';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.94);
  ctx.lineTo(r, r * 0.94);
  ctx.stroke();

  // 7. White ruffle underskirt — combined fill and stroke into ONE pass each
  const ruffles = 6; // Reduced from 10 for performance
  ctx.fillStyle = '#FFF5FA';
  ctx.beginPath();
  ctx.moveTo(-r, r);
  for (let i = 0; i <= ruffles; i++) {
    const ratio = i / ruffles;
    const x = -r + r * 2 * ratio;
    const nextX = -r + r * 2 * ((i + 1) / ruffles);
    const midX = (x + nextX) / 2;
    ctx.quadraticCurveTo(midX, r * 1.06, nextX, r);
  }
  ctx.closePath();
  ctx.fill();
  
  ctx.strokeStyle = '#E1BEE7';
  ctx.lineWidth = 0.8;
  ctx.stroke(); // Reuse the already-defined path for stroke

  // 8. Dark Leather Belt and Buckle
  ctx.fillStyle = '#3E2723';
  ctx.fillRect(-r * 0.8, r * 0.32, r * 1.6, r * 0.08);
  ctx.strokeStyle = '#27120B';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(-r * 0.8, r * 0.32, r * 1.6, r * 0.08);

  // Buckle circles — batched
  ctx.fillStyle = '#E5BA73';
  ctx.strokeStyle = '#C9A065';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, r * 0.36, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#A88048';
  ctx.beginPath();
  ctx.arc(0, r * 0.36, r * 0.08, 0, Math.PI * 2);
  ctx.stroke();

  // Center cyan gemstone + sparkle — batched fill
  ctx.fillStyle = '#00E5FF';
  ctx.beginPath();
  ctx.arc(0, r * 0.36, r * 0.05, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-1, r * 0.36 - 1, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // 9. Waist Chain & Pendant (Right side)
  ctx.strokeStyle = '#E5BA73';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(r * 0.08, r * 0.38);
  ctx.quadraticCurveTo(r * 0.3, r * 0.54, r * 0.5, r * 0.44);
  ctx.stroke();

  const pendantX = r * 0.5;
  const pendantY = r * 0.44;
  ctx.beginPath();
  ctx.moveTo(pendantX, pendantY);
  ctx.lineTo(pendantX + r * 0.05, pendantY + r * 0.05);
  ctx.stroke();

  // Diamond-shaped cyan gemstone pendant
  ctx.fillStyle = '#00E5FF';
  ctx.strokeStyle = '#E5BA73';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pendantX + r * 0.05, pendantY + r * 0.05);
  ctx.lineTo(pendantX + r * 0.12, pendantY + r * 0.12);
  ctx.lineTo(pendantX + r * 0.05, pendantY + r * 0.19);
  ctx.lineTo(pendantX - r * 0.02, pendantY + r * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(pendantX + r * 0.03, pendantY + r * 0.10, 1.0, 0, Math.PI * 2);
  ctx.fill();

  // 10. Spherical 3D Shading — radial gradient kept but only used once
  const sphereGlow = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r);
  sphereGlow.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  sphereGlow.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
  sphereGlow.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
  ctx.fillStyle = sphereGlow;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

export function drawLaylaBody(ctx, fighter) {
  const r = fighter.r;
  const size = Math.ceil(r * 1.2) * 2;
  
  if (!fighter._bodyCanvas || fighter._bodyCanvas.width !== size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const cctx = canvas.getContext('2d');
    cctx.translate(size / 2, size / 2);
    renderLaylaBodyDirect(cctx, r);
    fighter._bodyCanvas = canvas;
  }
  
  ctx.drawImage(fighter._bodyCanvas, -size / 2, -size / 2);
}
