// ─────────────────────────────────────────────
// YUJI ITADORI FIGHTER SKIN
// Color-theme approach: pink hair / skin / dark
// uniform — same simple block style as Gojo.
// ─────────────────────────────────────────────

import { getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';

/**
 * Main entry point — draws Yuji's body circle.
 */
export function drawYujiSkin(ctx, fighter) {
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  // 1. Draw afterimages (Zone trails) at their absolute coordinates
  if (!isLowQuality && fighter.afterImages && fighter.afterImages.length > 0) {
    for (let i = 0; i < fighter.afterImages.length; i++) {
      const ai = fighter.afterImages[i];
      if (ai.timer <= 0) continue;
      const progress = ai.timer / ai.maxTimer;
      const alpha = progress * 0.35; // Soft trail opacity

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(ai.x, ai.y);
      ctx.rotate(ai.angle);

      // Flip vertically if facing left
      if (Math.abs(ai.angle) > Math.PI / 2) {
        ctx.scale(1, -1);
      }

      // Draw the afterimage body circle - a semi-transparent blooming red/pink silhouette!
      ctx.beginPath();
      ctx.arc(0, 0, ai.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(217, 92, 126, 0.4)'; // Yuji's skin theme pink silhouette
      ctx.fill();

      // Add a soft red glow outline to the afterimage
      ctx.strokeStyle = 'rgba(230, 0, 30, 0.5)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.restore();
    }
  }

  const r = fighter.r;

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // Black Flash Zone Visual Indicator (crackling red/black sparks) - Optimized with batched stroke calls
  if (fighter.blackFlashTimer > 0) {
    const pulse = 0.6 + Math.sin(Date.now() * 0.015) * 0.4;
    const sparkCount = isLowQuality ? 2 : 4;
    
    // Draw rotating black outline sparks
    ctx.strokeStyle = `rgba(0, 0, 0, ${pulse * 0.85})`;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    for (let i = 0; i < sparkCount; i++) {
      const a = (Math.PI / 2) * i + (Date.now() * 0.016);
      ctx.moveTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4));
      ctx.lineTo(Math.cos(a) * (r + 14), Math.sin(a) * (r + 14));
    }
    ctx.stroke();
    
    // Draw rotating crimson core sparks (#B30000)
    ctx.strokeStyle = `rgba(179, 0, 0, ${pulse})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < sparkCount; i++) {
      const a = (Math.PI / 2) * i + (Date.now() * 0.016);
      ctx.moveTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4));
      ctx.lineTo(Math.cos(a) * (r + 12), Math.sin(a) * (r + 12));
    }
    ctx.stroke();

    if (!isLowQuality) {
      // Draw rotating lilac-white inner highlights (#F3E8FF)
      ctx.strokeStyle = `rgba(243, 232, 255, ${pulse * 0.9})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI / 2) * i + (Date.now() * 0.016);
        ctx.moveTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4));
        ctx.lineTo(Math.cos(a) * (r + 9), Math.sin(a) * (r + 9));
      }
      ctx.stroke();
    }
  }

  // ── Soul Swap Swirling Rotating Crimson Energy Rings - Optimized to eliminate nested save/restore ──
  if (fighter.soulSwapActive && !isLowQuality) {
    const time = Date.now();
    const ringRotation = time * 0.005;
    const ringRadius = r * 1.35; // slightly larger than body

    ctx.save();
    ctx.rotate(ringRotation);

    // Draw 3 counter-rotating crimson/red elliptical rings (using incremental rotation cascade)
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, ringRadius, ringRadius * (0.22 + i * 0.06), 0, 0, Math.PI * 2);
      
      // Outer glow outline
      ctx.strokeStyle = `rgba(230, 0, 10, 0.45)`;
      ctx.lineWidth = 4 - i * 0.8;
      ctx.stroke();

      // Inner sharp core
      ctx.strokeStyle = `rgba(255, 30, 0, 0.85)`;
      ctx.lineWidth = 1.8 - i * 0.3;
      ctx.stroke();

      ctx.rotate(Math.PI / 3);
    }
    ctx.restore();
  }

  // ── Soul Swap transformation transition effect (concentric shockwaves) ──
  if (fighter.soulSwapTransitionTimer > 0) {
    const progress = 1.0 - (fighter.soulSwapTransitionTimer / 45); // 0 to 1
    
    // Draw expanding shockwaves (fewer waves in performance/low quality mode)
    const wavesCount = isLowQuality ? 1 : 3;
    for (let i = 0; i < wavesCount; i++) {
      const p = (progress + i * 0.3) % 1.0;
      const radius = r + (p * 70); // expand up to r + 70px
      const alpha = 1.0 - p;
      
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(180, 0, 0, ${alpha * 0.8})`;
      ctx.lineWidth = 4 + (1 - p) * 6;
      ctx.stroke();
      
      // Draw crackling black electric sparks radiating outward along the wave radius (skipped in low quality)
      if (!isLowQuality) {
        ctx.strokeStyle = `rgba(15, 15, 15, ${alpha * 0.9})`;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        for (let j = 0; j < 8; j++) {
          const angle = (Math.PI / 4) * j + p * 3.5;
          const sx = Math.cos(angle) * (radius - 8);
          const sy = Math.sin(angle) * (radius - 8);
          const ex = Math.cos(angle) * (radius + 8);
          const ey = Math.sin(angle) * (radius + 8);
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
        }
        ctx.stroke();
      }
    }
  }

  // ── Clip everything inside the circle ──
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  // 1. Skin base — warm peach (changes to Sukuna's pale crimson-tinged skin when Soul Swap is active/transitioning)
  const isSukunaForm = fighter.soulSwapActive || (fighter.soulSwapTransitionTimer > 0);
  ctx.fillStyle = isSukunaForm ? '#E8B4A2' : '#F0C090';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Subtle shading gradient for 3D body volume
  if (isSukunaForm) {
    const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.3, r * 0.1, 0, 0, r * 1.05);
    bodyGrad.addColorStop(0, 'rgba(255, 235, 225, 0.25)');
    bodyGrad.addColorStop(0.7, 'rgba(180, 80, 70, 0.15)');
    bodyGrad.addColorStop(1, 'rgba(60, 10, 10, 0.45)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── 2. HAIR — dusty pink-salmon with jagged spiky fringe ──
  ctx.fillStyle = '#D9847A';
  ctx.beginPath();
  ctx.moveTo(-r, -r);
  ctx.lineTo(r, -r);
  ctx.lineTo(r, -r * 0.45);
  
  // Draw jagged teeth (asymmetric zig-zag pattern) from right to left along the hairline
  const hairline = [
    { x: r, y: -r * 0.45 },
    { x: r * 0.85, y: -r * 0.38 }, // tip
    { x: r * 0.70, y: -r * 0.48 }, // valley
    { x: r * 0.52, y: -r * 0.33 }, // tip (longer)
    { x: r * 0.35, y: -r * 0.46 }, // valley
    { x: r * 0.20, y: -r * 0.29 }, // tip (longest, central)
    { x: r * 0.05, y: -r * 0.50 }, // valley
    { x: -r * 0.12, y: -r * 0.35 }, // tip (medium)
    { x: -r * 0.28, y: -r * 0.47 }, // valley
    { x: -r * 0.48, y: -r * 0.31 }, // tip (longer)
    { x: -r * 0.62, y: -r * 0.49 }, // valley
    { x: -r * 0.78, y: -r * 0.36 }, // tip
    { x: -r, y: -r * 0.45 }
  ];
  for (const pt of hairline) {
    ctx.lineTo(pt.x, pt.y);
  }
  ctx.closePath();
  ctx.fill();

  // Stroke only the jagged bottom hairline edge with a clean black outline
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = Math.max(1.8, r * 0.055);
  ctx.lineJoin = 'miter';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hairline[0].x, hairline[0].y);
  for (let i = 1; i < hairline.length; i++) {
    ctx.lineTo(hairline[i].x, hairline[i].y);
  }
  ctx.stroke();

  // ── Yuji's facial scars (drawn in the skin region) ──
  ctx.lineCap = 'round';

  // Scar 1: diagonal slash across the left brow area (his signature scar)
  ctx.strokeStyle = '#A0614A';
  ctx.lineWidth = Math.max(1.8, r * 0.065);
  ctx.beginPath();
  ctx.moveTo(-r * 0.25, -r * 0.30);
  ctx.lineTo( r * 0.02, -r * 0.08);
  ctx.stroke();

  // Scar edge highlight (slightly lighter top edge for depth)
  ctx.strokeStyle = 'rgba(210, 150, 120, 0.5)';
  ctx.lineWidth = Math.max(0.8, r * 0.025);
  ctx.beginPath();
  ctx.moveTo(-r * 0.24, -r * 0.32);
  ctx.lineTo( r * 0.03, -r * 0.10);
  ctx.stroke();

  // Scar 2: small chin mark (second scar from reference image)
  ctx.strokeStyle = '#A0614A';
  ctx.lineWidth = Math.max(1.2, r * 0.045);
  ctx.beginPath();
  ctx.moveTo(-r * 0.06, r * 0.18);
  ctx.lineTo( r * 0.08, r * 0.28);
  ctx.stroke();

  // ── 3. JACKET — dark navy base ──
  ctx.fillStyle = '#1A1F2E';
  ctx.fillRect(-r, r * 0.38, r * 2, r * 0.72);

  // Subtle jacket panel shading (slightly lighter on sides for fabric folds)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fillRect(-r, r * 0.38, r * 0.55, r * 0.72);

  // Collar — V-neck opening showing skin underneath
  ctx.fillStyle = isSukunaForm ? '#E8B4A2' : '#F0C090';
  ctx.beginPath();
  ctx.moveTo(0, r * 0.42);
  ctx.lineTo(-r * 0.22, r * 0.60);
  ctx.lineTo( r * 0.22, r * 0.60);
  ctx.closePath();
  ctx.fill();

  // Collar lapel outlines (dark edges of the V)
  ctx.strokeStyle = '#0F1320';
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, r * 0.42);
  ctx.lineTo(-r * 0.22, r * 0.60);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, r * 0.42);
  ctx.lineTo( r * 0.22, r * 0.60);
  ctx.stroke();

  // Center zipper line (runs from collar down)
  ctx.strokeStyle = '#2A3248';
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.lineCap = 'butt';
  ctx.beginPath();
  ctx.moveTo(0, r * 0.60);
  ctx.lineTo(0, r * 0.96);
  ctx.stroke();

  // Red D-ring clips — Yuji's signature JJK jacket detail
  const clipY = r * 0.64;
  const clipSize = Math.max(2.5, r * 0.072);
  for (const cx of [-r * 0.26, r * 0.26]) {
    // Clip ring (red arc)
    ctx.strokeStyle = '#CC2222';
    ctx.lineWidth = Math.max(1.5, r * 0.055);
    ctx.beginPath();
    ctx.arc(cx, clipY, clipSize, Math.PI * 0.2, Math.PI * 1.8);
    ctx.stroke();
    // Small grey anchor dot
    ctx.fillStyle = '#3A4055';
    ctx.beginPath();
    ctx.arc(cx, clipY - clipSize * 0.8, clipSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Soul Swap — Sukuna face markings (drawn during transition and active state)
  if (isSukunaForm) {
    ctx.fillStyle = '#0a0a0d';
    ctx.strokeStyle = '#0a0a0d';

    // --- A. Top Hairline Spikes (3 downward teeth) ---
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.65);
    ctx.lineTo(-r * 0.12, -r * 0.95);
    ctx.lineTo(r * 0.12, -r * 0.95);
    ctx.closePath();
    ctx.moveTo(-r * 0.28, -r * 0.70);
    ctx.lineTo(-r * 0.40, -r * 0.95);
    ctx.lineTo(-r * 0.18, -r * 0.95);
    ctx.closePath();
    ctx.moveTo(r * 0.28, -r * 0.70);
    ctx.lineTo(r * 0.18, -r * 0.95);
    ctx.lineTo(r * 0.40, -r * 0.95);
    ctx.closePath();
    ctx.fill();

    // --- B. Forehead & Nose Bridge Markings (Dot + Chevrons) ---
    // Central Dot
    ctx.beginPath();
    ctx.arc(0, -r * 0.32, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Left Bracket ┌
    ctx.beginPath();
    ctx.lineWidth = Math.max(1.8, r * 0.07);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';
    ctx.moveTo(-r * 0.36, -r * 0.46);
    ctx.lineTo(-r * 0.20, -r * 0.46);
    ctx.lineTo(-r * 0.18, -r * 0.16);
    ctx.lineTo(-r * 0.28, -r * 0.14);
    ctx.stroke();

    // Right Bracket ┐
    ctx.beginPath();
    ctx.moveTo(r * 0.36, -r * 0.46);
    ctx.lineTo(r * 0.20, -r * 0.46);
    ctx.lineTo(r * 0.18, -r * 0.16);
    ctx.lineTo(r * 0.28, -r * 0.14);
    ctx.stroke();

    // --- C. Cheek Jagged Markings & Jawline Wrap (Left & Right) ---
    // Left Cheek Tattoo Branch
    ctx.beginPath();
    ctx.lineWidth = Math.max(2.2, r * 0.08);
    ctx.moveTo(-r * 0.38, -r * 0.08);
    ctx.lineTo(-r * 0.52, -r * 0.24);
    ctx.lineTo(-r * 0.46, -r * 0.32);
    ctx.lineTo(-r * 0.68, -r * 0.34);
    ctx.lineTo(-r * 0.60, -r * 0.18);
    ctx.lineTo(-r * 0.88, -r * 0.12);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-r * 0.60, -r * 0.18);
    ctx.lineTo(-r * 0.85, 0);
    ctx.lineTo(-r * 0.75, r * 0.48);
    ctx.lineTo(-r * 0.30, r * 0.66);
    ctx.stroke();

    // Right Cheek Tattoo Branch
    ctx.beginPath();
    ctx.moveTo(r * 0.38, -r * 0.08);
    ctx.lineTo(r * 0.52, -r * 0.24);
    ctx.lineTo(r * 0.46, -r * 0.32);
    ctx.lineTo(r * 0.68, -r * 0.34);
    ctx.lineTo(r * 0.60, -r * 0.18);
    ctx.lineTo(r * 0.88, -r * 0.12);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(r * 0.60, -r * 0.18);
    ctx.lineTo(r * 0.85, 0);
    ctx.lineTo(r * 0.75, r * 0.48);
    ctx.lineTo(r * 0.30, r * 0.66);
    ctx.stroke();

    // Jaw band connecting left and right lower jawline
    ctx.beginPath();
    ctx.lineWidth = Math.max(2.5, r * 0.09);
    ctx.moveTo(-r * 0.82, r * 0.38);
    ctx.lineTo(-r * 0.40, r * 0.64);
    ctx.lineTo(0, r * 0.68);
    ctx.lineTo(r * 0.40, r * 0.64);
    ctx.lineTo(r * 0.82, r * 0.38);
    ctx.stroke();

    // --- E. Smirk Mouth Line ---
    ctx.beginPath();
    ctx.lineWidth = Math.max(1.8, r * 0.06);
    ctx.moveTo(-r * 0.26, r * 0.24);
    ctx.lineTo(-r * 0.10, r * 0.30);
    ctx.lineTo(0, r * 0.26);
    ctx.lineTo(r * 0.10, r * 0.30);
    ctx.lineTo(r * 0.26, r * 0.24);
    ctx.stroke();

    // --- F. Chin Markings (3 Upward Triangles) ---
    ctx.beginPath();
    ctx.moveTo(0, r * 0.72);
    ctx.lineTo(-r * 0.08, r * 0.94);
    ctx.lineTo(r * 0.08, r * 0.94);
    ctx.closePath();
    ctx.moveTo(-r * 0.16, r * 0.74);
    ctx.lineTo(-r * 0.26, r * 0.92);
    ctx.lineTo(-r * 0.10, r * 0.94);
    ctx.closePath();
    ctx.moveTo(r * 0.16, r * 0.74);
    ctx.lineTo(r * 0.10, r * 0.94);
    ctx.lineTo(r * 0.26, r * 0.92);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore(); // undo clip

  // 5. Bold black outline
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Status overlays (stun, freeze, etc.)
  if (typeof fighter.drawStatusOverlays === 'function') {
    fighter.drawStatusOverlays(ctx, r);
  }

  ctx.restore(); // end translate

  // ── Hands ──
  drawYujiHands(ctx, fighter);
}

// ─────────────────────────────────────────────
// HAND RENDERER — skin-toned fists
// ─────────────────────────────────────────────
function drawYujiHands(ctx, fighter) {
  if (typeof state !== 'undefined' && (state.gameState === 'countdown' || fighter._isWinnerReveal)) {
    return;
  }
  
  const isPunching = fighter.punchAnimTimer > 0;
  const isBF = fighter.blackFlashTimer > 0;
  const r = fighter.r;
  const handRadius = getHandSize(7.5);
  
  const isSukunaForm = fighter.soulSwapActive || (fighter.soulSwapTransitionTimer > 0);
  const skinColor = isSukunaForm ? '#C03030' : '#F0C090';

  ctx.save();
  ctx.translate(fighter.x, fighter.y);

  // Force hands to point straight down (0 angle relative to body) on Champion Screen so they sit at bottom left/right
  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  // Cubic ease-in-out punch lunge (same as Todo)
  let rawProgress = 0;
  if (isPunching) {
    const maxT = fighter.punchActiveMaxTime || fighter.punchMaxTime || 16;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
  }
  const smooth = rawProgress < 0.5
    ? 4 * rawProgress * rawProgress * rawProgress
    : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;

  const lunge = isPunching ? Math.sin(smooth * Math.PI) * 32 : 0;

  let frontX = -r * 0.55, frontY = r * 0.35;
  let backX  =  r * 0.55, backY  = r * 0.35;

  if (isPunching) {
    if (fighter.isRightPunch) {
      frontX += lunge * 2.2;
      frontY *= 0.4;
    } else {
      backX += lunge * 1.2;
      backY *= 0.4;
    }
  }

  _drawFist(ctx, backX,  backY,  handRadius, skinColor, fighter);
  _drawFist(ctx, frontX, frontY, handRadius, skinColor, fighter);

  ctx.restore();
}

function _drawFist(ctx, x, y, radius, skinColor, fighter) {
  ctx.save();

  const charge = fighter.blackFlashCharge || 0;
  const chargeMax = fighter.blackFlashThreshold || 4;
  const aura = (fighter._isWinnerReveal) ? 1.0 : (fighter.combatAuraOpacity || 0);
  const glow = Math.max(aura, (charge / chargeMax) * 0.85);

  // 1. CE glow around fist — standard blue or Black Flash zone crimson/black theme or red Sukuna theme
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  if (!isLowQuality && (glow > 0.01 || fighter.blackFlashTimer > 0)) {
    const grad = ctx.createRadialGradient(x, y, radius * 0.3, x, y, radius * 1.8);
    const activeGlow = fighter.blackFlashTimer > 0 ? 1.0 : glow;
    const isSukunaForm = fighter.soulSwapActive || (fighter.soulSwapTransitionTimer > 0);
    
    if (fighter.blackFlashTimer > 0) {
      // Crimson Zone Glow: Lilac-white core -> Deep Crimson red -> Stark Black edge
      grad.addColorStop(0,    `rgba(243, 232, 255, ${0.95 * activeGlow})`);
      grad.addColorStop(0.35, `rgba(179, 0, 0, ${0.85 * activeGlow})`);
      grad.addColorStop(0.75, `rgba(0, 0, 0, ${0.75 * activeGlow})`);
      grad.addColorStop(1.0,  'rgba(0, 0, 0, 0)');
    } else if (isSukunaForm) {
      // Red Sukuna CE glow
      grad.addColorStop(0,   `rgba(255, 255, 255, ${0.85 * activeGlow})`);
      grad.addColorStop(0.35,`rgba(255, 30,  0,   ${0.75 * activeGlow})`);
      grad.addColorStop(0.75,`rgba(180, 0,   0,   ${0.40 * activeGlow})`);
      grad.addColorStop(1.0, 'rgba(150, 0,   0,   0)');
    } else {
      // Blue standard JJK CE glow
      grad.addColorStop(0,   `rgba(255, 255, 255, ${0.85 * activeGlow})`);
      grad.addColorStop(0.35,`rgba(0, 229,  255, ${0.68 * activeGlow})`);
      grad.addColorStop(0.75,`rgba(0, 140,   255, ${0.32 * activeGlow})`);
      grad.addColorStop(1.0, 'rgba(0, 100, 255, 0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Fist body
  // 2. Fist body
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  // 3. Fist outline (standard black)
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}


