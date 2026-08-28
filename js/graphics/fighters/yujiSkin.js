// ─────────────────────────────────────────────
// YUJI ITADORI FIGHTER SKIN
// Color-theme approach: pink hair / skin / dark
// uniform — same simple block style as Gojo.
// ─────────────────────────────────────────────

import { CONFIG, getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';

let _yujiSkinImage = null;
let _yujiSkinImageLoading = false;

export function _getYujiSkinImage() {
  if (_yujiSkinImage && _yujiSkinImage.complete && _yujiSkinImage.naturalWidth > 0) {
    return _yujiSkinImage;
  }
  if (!_yujiSkinImageLoading && typeof Image !== 'undefined') {
    _yujiSkinImageLoading = true;
    const img = new Image();
    img.onload = () => {
      _yujiSkinImage = img;
      _yujiSkinImageLoading = false;
    };
    img.onerror = (e) => {
      console.warn('Failed to load Yuji skin image at Assets/model/Yuji-SKIN.png', e);
      _yujiSkinImageLoading = false;
    };
    img.src = 'Assets/model/Yuji-SKIN.png?v=1';
    _yujiSkinImage = img;
  }
  return _yujiSkinImage;
}

if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  _getYujiSkinImage();
}

/**
 * Main entry point — draws Yuji's body circle.
 */
export function drawYujiSkin(ctx, fighter) {
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const now = Date.now();
  // 1. Draw afterimages (Zone trails) at their absolute coordinates
  const isGojoDomainActive = typeof state !== 'undefined' && state.fighters && state.fighters.some(f => 
    f && (f.characterId === 'gojo' || f.type === 'gojo' || f._def?.id === 'gojo') && f.domainActive
  );
  if (!isLowQuality && fighter.afterImages && fighter.afterImages.length > 0 && !isGojoDomainActive) {
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

  // Black Flash Zone Visual Indicator (Stepped pixel crackling lightning streaks - No Diamonds)
  if (fighter.blackFlashTimer > 0) {
    const isMatchEnded = typeof state !== 'undefined' && (state.gameState === 'roundEnd' || state.gameState === 'matchEnd' || fighter._isWinnerReveal);
    const pulse = isMatchEnded ? 0.90 : (0.6 + Math.sin(now * 0.015) * 0.4);
    const sparkCount = isLowQuality ? 2 : (isMatchEnded ? 2 : 4);
    const rotSpeed = isMatchEnded ? 0 : (now * 0.016);
    const P = 2.0;

    for (let i = 0; i < sparkCount; i++) {
      const a = (Math.PI / 2) * i + rotSpeed;
      const sDist = r + 4;
      const x0 = Math.round((Math.cos(a) * sDist) / P) * P;
      const y0 = Math.round((Math.sin(a) * sDist) / P) * P;
      const x1 = Math.round((Math.cos(a + 0.3) * (sDist + 10)) / P) * P;
      const y1 = Math.round((Math.sin(a + 0.3) * (sDist + 10)) / P) * P;

      // 1. Black outer streak
      ctx.fillStyle = `rgba(0, 0, 0, ${pulse * 0.85})`;
      const steps = 4;
      for (let s = 0; s <= steps; s++) {
        const px = Math.round((x0 + (x1 - x0) * (s / steps)) / P) * P;
        const py = Math.round((y0 + (y1 - y0) * (s / steps)) / P) * P;
        ctx.fillRect(px - P, py - P, P * 2, P * 2);
      }

      // 2. Crimson core line
      ctx.fillStyle = `rgba(220, 20, 40, ${pulse})`;
      for (let s = 0; s <= steps; s++) {
        const px = Math.round((x0 + (x1 - x0) * (s / steps)) / P) * P;
        const py = Math.round((y0 + (y1 - y0) * (s / steps)) / P) * P;
        ctx.fillRect(px - P * 0.5, py - P * 0.5, P, P);
      }

      // 3. Specular lilac-white tip
      if (!isLowQuality) {
        ctx.fillStyle = `rgba(243, 232, 255, ${pulse * 0.95})`;
        ctx.fillRect(x1 - P * 0.5, y1 - P * 0.5, P, P);
      }
    }
  }

  // ── Soul Swap Swirling Rotating Crimson Energy Rings - Optimized to eliminate nested save/restore ──
  if (fighter.soulSwapActive && !isLowQuality) {
    const time = now;
    const ringRotation = time * 0.005;
    const ringRadius = r * 1.35; // slightly larger than body

    ctx.save();
    ctx.rotate(ringRotation);

    // Draw 2-3 counter-rotating crimson/red elliptical rings (reduced in low quality)
    const ringCount = isLowQuality ? 2 : 3;
    for (let i = 0; i < ringCount; i++) {
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

  const angle = fighter._isWinnerReveal ? 0 : (fighter.gunAngle || 0);
  ctx.rotate(angle);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  if (facingLeft) ctx.scale(1, -1);

  // Smooth sinusoidal punch progress (eliminates sharp cubic snapping)
  const isPodiumPreview = Boolean(fighter._isWinnerReveal);
  const isPunching = !isPodiumPreview && fighter.punchAnimTimer > 0;
  let rawProgress = 0;
  if (isPunching) {
    const maxT = fighter.punchActiveMaxTime || fighter.punchMaxTime || 14;
    rawProgress = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxT)));
  }

  let easePunch = 0;
  if (isPunching) {
    if (rawProgress < 0.28) {
      easePunch = Math.sin((rawProgress / 0.28) * (Math.PI / 2));
    } else {
      const retractT = (rawProgress - 0.28) / 0.72;
      easePunch = Math.cos(retractT * (Math.PI / 2));
    }
  }
  const lungeExtension = isPunching ? easePunch * (r * 1.5) : 0;
  const oppositeRecoil = isPunching ? -Math.sin(rawProgress * Math.PI) * (r * 0.20) : 0;

  let frontX = r * 0.95, frontY = 0;
  let backX = 0, backY = 0;
  let hideFrontHand = (typeof state !== 'undefined' && state.showSkinOnly) || isPodiumPreview;
  let hideBackHand = true; // Back hand hidden for brawler single front hand stance
  fighter.hideFrontHand = hideFrontHand;
  fighter.hideBackHand = hideBackHand;

  const isSukunaForm = fighter.soulSwapActive || (fighter.soulSwapTransitionTimer > 0);
  const isSlashActive = !isPodiumPreview && ((fighter.slashSwingTimer > 0) || ((fighter.rapidSlashHitsLeft || 0) > 0) || (isSukunaForm && fighter.punchAnimTimer > 0));

  // Single-Handed Sukuna Slash Swing Chop Animation
  if (isSlashActive) {
    const maxT = fighter.slashSwingMaxTimer || 14;
    let rawT = 0;
    if (fighter.slashSwingTimer > 0) {
      rawT = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.slashSwingTimer / maxT)));
    } else if (fighter.punchAnimTimer > 0) {
      const maxP = fighter.punchActiveMaxTime || fighter.punchMaxTime || 22;
      rawT = Math.min(1.0, Math.max(0.0, 1.0 - (fighter.punchAnimTimer / maxP)));
    } else {
      const slashCd = CONFIG.yuji?.soulSwapRapidSlashCooldown || 20;
      const timerVal = fighter.rapidSlashTimer || 0;
      rawT = Math.min(1.0, Math.max(0.0, 1.0 - (timerVal / slashCd)));
    }

    const startAngle = (fighter.slashHand === 1) ? -Math.PI / 2 : Math.PI / 2;
    const endAngle   = (fighter.slashHand === 1) ?  Math.PI / 2 : -Math.PI / 2;
    const chopAngle  = startAngle + rawT * (endAngle - startAngle);

    const lungeOut = Math.sin(rawT * Math.PI) * (r * 1.5);
    const chopX = Math.cos(chopAngle) * (r * 0.9) + lungeOut;
    const chopY = Math.sin(chopAngle) * (r * 1.4);

    frontX = chopX;
    frontY = chopY;
    hideBackHand = true;
  } else if (isPunching && !isSukunaForm) {
    // All punches executed with the front hand extending forward from right edge
    frontX = r * 0.95 + lungeExtension * 1.40;
    frontY = Math.sin(rawProgress * Math.PI) * (r * 0.20);
  } else if (isSukunaForm) {
    frontX = r * 0.95; frontY = 0;
  } else {
    // Idle brawler guard stance: front hand at the right edge of body circle
    frontX = r * 0.95; frontY = 0;
  }

  const handRadius = getHandSize(7.5);
  const skinColor = isSukunaForm ? '#C03030' : '#F0C090';

  // 1. Render Back Hand (Back Layer - Hidden for brawlers)
  if (!fighter._isWinnerReveal && !hideBackHand) {
    _drawFist(ctx, backX, backY, handRadius, skinColor, fighter);
  }

  // ── Clip everything inside the circle ──
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();

  const yujiImg = _getYujiSkinImage();
  if (yujiImg && yujiImg.complete && yujiImg.naturalWidth > 0 && !isSukunaForm) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    // Exact centered crop of Yuji-SKIN.png (sx: 25, sy: 4, sw: 452, sh: 448)
    const modelScale = 1.08;
    const drawR = r * modelScale;
    ctx.drawImage(yujiImg, 25, 4, 452, 448, -drawR, -drawR, drawR * 2, drawR * 2);
    ctx.restore();
  } else {
    // 1. Skin base — warm peach (changes to Sukuna's pale crimson-tinged skin when Soul Swap is active/transitioning)
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

  // ── 3. JUJUTSU HIGH UNIFORM & ICONIC RED HOOD / COWL (Anime Reference) ──
  // A. Neck opening with throat shadow
  ctx.fillStyle = isSukunaForm ? '#C68A64' : '#DB9B72'; // Darker neck cast shadow
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, r * 0.08);
  ctx.lineTo( r * 0.32, r * 0.08);
  ctx.lineTo( r * 0.22, r * 0.32);
  ctx.lineTo( 0, r * 0.35);
  ctx.lineTo(-r * 0.22, r * 0.32);
  ctx.closePath();
  ctx.fill();

  // B. Dark Violet-Navy Uniform Jacket Body (Lower Torso)
  ctx.fillStyle = '#22263D';
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.40);
  ctx.lineTo( r, r * 0.40);
  ctx.lineTo( r, r);
  ctx.lineTo(-r, r);
  ctx.closePath();
  ctx.fill();

  // Shaded lower jacket sides & folds
  ctx.fillStyle = '#171A2B';
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.40);
  ctx.lineTo(-r * 0.50, r * 0.48);
  ctx.lineTo(-r * 0.45, r);
  ctx.lineTo(-r, r);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(r, r * 0.40);
  ctx.lineTo(r * 0.70, r * 0.50);
  ctx.lineTo(r * 0.65, r);
  ctx.lineTo(r, r);
  ctx.closePath();
  ctx.fill();

  // Asymmetric Diagonal Chest Placket / Lapel (sweeps down-rightward across chest)
  ctx.save();
  ctx.fillStyle = '#282D48';
  ctx.beginPath();
  ctx.moveTo(-r * 0.25, r * 0.52);
  ctx.lineTo( r * 0.58, r * 0.68);
  ctx.lineTo( r * 0.54, r * 0.96);
  ctx.lineTo(-r * 0.15, r * 0.96);
  ctx.closePath();
  ctx.fill();

  // Diagonal chest placket seam line
  ctx.strokeStyle = '#0E101A';
  ctx.lineWidth = Math.max(1.4, r * 0.055);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.25, r * 0.52);
  ctx.lineTo( r * 0.58, r * 0.68);
  ctx.stroke();

  // Diagonal fabric fold crease lines on navy uniform
  ctx.strokeStyle = '#151828';
  ctx.lineWidth = Math.max(1.0, r * 0.038);
  ctx.beginPath();
  ctx.moveTo(-r * 0.40, r * 0.68);
  ctx.quadraticCurveTo(-r * 0.10, r * 0.80, r * 0.35, r * 0.82);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-r * 0.35, r * 0.80);
  ctx.quadraticCurveTo(-r * 0.05, r * 0.90, r * 0.30, r * 0.92);
  ctx.stroke();

  // Third Golden Jujutsu Swirl Button on Left Chest Placket Point
  _drawJJKSwirlButton(ctx, r * 0.46, r * 0.68, Math.max(2.2, r * 0.08));
  ctx.restore();

  // C. Voluminous Vivid Red Hoodie / Cowl Neck Wrap (Overlapping Layer)
  // 1. Back/Shoulder Drapery Shadow Layer (Dark Deep Red #6E0D12)
  ctx.fillStyle = '#6E0D12';
  ctx.beginPath();
  // Left shoulder drape
  ctx.moveTo(-r, r * 0.18);
  ctx.quadraticCurveTo(-r * 0.55, r * 0.10, -r * 0.20, r * 0.24);
  ctx.lineTo(-r * 0.22, r * 0.54);
  ctx.quadraticCurveTo(-r * 0.65, r * 0.56, -r, r * 0.42);
  ctx.closePath();
  ctx.fill();

  // Right shoulder drape
  ctx.beginPath();
  ctx.moveTo(r * 0.18, r * 0.24);
  ctx.quadraticCurveTo(r * 0.55, r * 0.10, r, r * 0.18);
  ctx.lineTo(r, r * 0.42);
  ctx.quadraticCurveTo(r * 0.60, r * 0.54, r * 0.22, r * 0.54);
  ctx.closePath();
  ctx.fill();

  // 2. Main Vivid Red Cowl Body (Bright Crimson #C92A2A)
  ctx.fillStyle = '#C92A2A';
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.22);
  ctx.quadraticCurveTo(-r * 0.60, r * 0.12, -r * 0.22, r * 0.26);
  ctx.lineTo(-r * 0.18, r * 0.50);
  ctx.quadraticCurveTo(-r * 0.65, r * 0.50, -r, r * 0.38);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(r * 0.18, r * 0.26);
  ctx.quadraticCurveTo(r * 0.60, r * 0.12, r, r * 0.22);
  ctx.lineTo(r, r * 0.38);
  ctx.quadraticCurveTo(r * 0.60, r * 0.50, r * 0.18, r * 0.50);
  ctx.closePath();
  ctx.fill();

  // 3. Red Cowl Fabric Creases & Soft Roll Highlights (Upper Bright Lip #E03131)
  ctx.strokeStyle = '#E03131';
  ctx.lineWidth = Math.max(1.6, r * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  // Left upper fold lip
  ctx.moveTo(-r * 0.90, r * 0.22);
  ctx.quadraticCurveTo(-r * 0.55, r * 0.15, -r * 0.24, r * 0.26);
  ctx.stroke();
  // Right upper fold lip
  ctx.beginPath();
  ctx.moveTo(r * 0.24, r * 0.26);
  ctx.quadraticCurveTo(r * 0.55, r * 0.15, r * 0.90, r * 0.22);
  ctx.stroke();

  // Inner cowl crease shadows
  ctx.strokeStyle = '#80141A';
  ctx.lineWidth = Math.max(1.3, r * 0.05);
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, r * 0.34);
  ctx.quadraticCurveTo(-r * 0.50, r * 0.32, -r * 0.22, r * 0.40);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(r * 0.22, r * 0.40);
  ctx.quadraticCurveTo(r * 0.50, r * 0.32, r * 0.85, r * 0.34);
  ctx.stroke();

  // 4. Center-Front Overlapping Collar Flap (Right Flap crossing to Left)
  // Drop shadow cast under the overlapping flap onto the left drape
  ctx.fillStyle = '#5C0E13';
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, r * 0.20);
  ctx.lineTo(-r * 0.18, r * 0.22);
  ctx.lineTo(-r * 0.18, r * 0.58);
  ctx.lineTo(-r * 0.32, r * 0.58);
  ctx.closePath();
  ctx.fill();

  // The Overlapping Front Flap Body (#C92A2A with shadow bottom #A61E22)
  ctx.fillStyle = '#C92A2A';
  ctx.beginPath();
  ctx.moveTo(-r * 0.24, r * 0.22);
  ctx.lineTo( r * 0.42, r * 0.18);
  ctx.quadraticCurveTo(r * 0.56, r * 0.35, r * 0.45, r * 0.54);
  ctx.lineTo(-r * 0.22, r * 0.56);
  ctx.quadraticCurveTo(-r * 0.26, r * 0.38, -r * 0.24, r * 0.22);
  ctx.closePath();
  ctx.fill();

  // Flap highlight fold along top edge
  ctx.strokeStyle = '#EE5253';
  ctx.lineWidth = Math.max(1.4, r * 0.055);
  ctx.beginPath();
  ctx.moveTo(-r * 0.24, r * 0.22);
  ctx.lineTo( r * 0.42, r * 0.18);
  ctx.stroke();

  // Crisp Manga Dark Ink Boundary Lines around the red collar
  ctx.strokeStyle = '#140205';
  ctx.lineWidth = Math.max(1.3, r * 0.05);
  ctx.lineCap = 'round';
  ctx.beginPath();
  // Flap vertical overlapping edge
  ctx.moveTo(-r * 0.24, r * 0.22);
  ctx.quadraticCurveTo(-r * 0.27, r * 0.38, -r * 0.22, r * 0.56);
  ctx.lineTo(r * 0.45, r * 0.54);
  ctx.stroke();

  // Outer collar outline
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.20);
  ctx.quadraticCurveTo(-r * 0.55, r * 0.10, -r * 0.24, r * 0.22);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(r * 0.42, r * 0.18);
  ctx.quadraticCurveTo(r * 0.65, r * 0.10, r, r * 0.20);
  ctx.stroke();

  // 5. Two Golden Jujutsu Swirl Buttons on the Red Overlapping Collar Flap
  // Upper Collar Swirl Button (Button 1)
  _drawJJKSwirlButton(ctx, -r * 0.10, r * 0.32, Math.max(2.3, r * 0.088));

  // Lower Collar Swirl Button (Button 2)
  _drawJJKSwirlButton(ctx, -r * 0.10, r * 0.46, Math.max(2.3, r * 0.088));

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

  // ── Render Front Hand (Front Layer - On Top of Body Circle) ──
  if (!fighter._isWinnerReveal && !hideFrontHand) {
    _drawFist(ctx, frontX, frontY, handRadius, skinColor, fighter);
  }

  ctx.restore(); // end translate & rotate transform stream
}

// ─────────────────────────────────────────────────────────────────────────────
// PRE-RENDERED FIST CE GLOW CANVASES (Zero-GC GPU Blitting)
// ─────────────────────────────────────────────────────────────────────────────
let _bfGlowCanvas = null;
let _sukunaGlowCanvas = null;
let _blueGlowCanvas = null;

function _initYujiGlowCanvases() {
  if (typeof document === 'undefined' || _bfGlowCanvas) return;

  // 1. Black Flash Zone Glow: Lilac-white core -> Deep Crimson red -> Stark Black edge
  _bfGlowCanvas = document.createElement('canvas');
  _bfGlowCanvas.width = 64;
  _bfGlowCanvas.height = 64;
  const bfCtx = _bfGlowCanvas.getContext('2d');
  const bfGrad = bfCtx.createRadialGradient(32, 32, 5, 32, 32, 32);
  bfGrad.addColorStop(0,    'rgba(243, 232, 255, 0.95)');
  bfGrad.addColorStop(0.35, 'rgba(179, 0, 0, 0.85)');
  bfGrad.addColorStop(0.75, 'rgba(0, 0, 0, 0.75)');
  bfGrad.addColorStop(1.0,  'rgba(0, 0, 0, 0)');
  bfCtx.fillStyle = bfGrad;
  bfCtx.fillRect(0, 0, 64, 64);

  // 2. Red Sukuna CE glow
  _sukunaGlowCanvas = document.createElement('canvas');
  _sukunaGlowCanvas.width = 64;
  _sukunaGlowCanvas.height = 64;
  const sCtx = _sukunaGlowCanvas.getContext('2d');
  const sGrad = sCtx.createRadialGradient(32, 32, 5, 32, 32, 32);
  sGrad.addColorStop(0,    'rgba(255, 255, 255, 0.85)');
  sGrad.addColorStop(0.35, 'rgba(255, 30,  0,   0.75)');
  sGrad.addColorStop(0.75, 'rgba(180, 0,   0,   0.40)');
  sGrad.addColorStop(1.0,  'rgba(150, 0,   0,   0)');
  sCtx.fillStyle = sGrad;
  sCtx.fillRect(0, 0, 64, 64);

  // 3. Blue standard JJK CE glow
  _blueGlowCanvas = document.createElement('canvas');
  _blueGlowCanvas.width = 64;
  _blueGlowCanvas.height = 64;
  const bCtx = _blueGlowCanvas.getContext('2d');
  const bGrad = bCtx.createRadialGradient(32, 32, 5, 32, 32, 32);
  bGrad.addColorStop(0,    'rgba(255, 255, 255, 0.85)');
  bGrad.addColorStop(0.35, 'rgba(0, 229,  255, 0.68)');
  bGrad.addColorStop(0.75, 'rgba(0, 140,   255, 0.32)');
  bGrad.addColorStop(1.0,  'rgba(0, 100, 255, 0)');
  bCtx.fillStyle = bGrad;
  bCtx.fillRect(0, 0, 64, 64);
}

function _drawFist(ctx, x, y, radius, skinColor, fighter) {
  ctx.save();

  const charge = fighter.blackFlashCharge || 0;
  const chargeMax = fighter.blackFlashThreshold || 4;
  const aura = (fighter._isWinnerReveal) ? 1.0 : (fighter.combatAuraOpacity || 0);
  const glow = Math.max(aura, (charge / chargeMax) * 0.85);

  // 1. CE glow around fist — fast texture blit instead of per-frame createRadialGradient
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  if (!isLowQuality && (glow > 0.01 || fighter.blackFlashTimer > 0)) {
    _initYujiGlowCanvases();
    const activeGlow = fighter.blackFlashTimer > 0 ? 1.0 : glow;
    const isSukunaForm = fighter.soulSwapActive || (fighter.soulSwapTransitionTimer > 0);
    const glowCanvas = fighter.blackFlashTimer > 0 ? _bfGlowCanvas : (isSukunaForm ? _sukunaGlowCanvas : _blueGlowCanvas);

    if (glowCanvas) {
      const glowR = radius * 1.8;
      ctx.globalAlpha = Math.max(0, Math.min(1.0, activeGlow));
      ctx.drawImage(glowCanvas, x - glowR, y - glowR, glowR * 2, glowR * 2);
    }
  }

  // 2. Stepped Pixel-Art Fist Body & Outer Manga Border
  ctx.globalAlpha = 1.0;
  const P = 2.0;
  const gridR = Math.max(P * 2, radius);
  const steps = Math.ceil(gridR / P);
  const shadowColor = '#C99478';

  // Outer Dark Pixel Border Shell
  ctx.fillStyle = '#0E0F14';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= gridR + P * 0.75) {
        ctx.fillRect(Math.round(x + gx * P), Math.round(y + gy * P), P, P);
      }
    }
  }

  // Inner Base Skin Tone
  ctx.fillStyle = skinColor;
  const innerR = gridR - P * 0.4;
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR) {
        ctx.fillRect(Math.round(x + gx * P), Math.round(y + gy * P), P, P);
      }
    }
  }

  // Knuckle Depth Shading
  ctx.fillStyle = shadowColor;
  for (let gy = 0; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR && (gy * P > innerR * 0.35 || gx * P < -innerR * 0.45)) {
        ctx.fillRect(Math.round(x + gx * P), Math.round(y + gy * P), P, P);
      }
    }
  }

  // Knuckle Specular Glint Pixels
  ctx.fillStyle = '#FFF2EB';
  const hx = Math.round(x + P * 0.5);
  const hy = Math.round(y - innerR * 0.45);
  ctx.fillRect(hx, hy, P, P);
  ctx.fillRect(hx + P, hy, P, P);

  ctx.restore();
}

/**
 * Draws an authentic golden Jujutsu High swirl / spiral button matching the anime reference.
 */
function _drawJJKSwirlButton(ctx, x, y, radius) {
  ctx.save();
  ctx.translate(x, y);

  // 1. Dark ink socket / drop shadow
  ctx.fillStyle = '#0E101A';
  ctx.beginPath();
  ctx.arc(0.4, 0.4, radius + 0.3, 0, Math.PI * 2);
  ctx.fill();

  // 2. Antique Golden Metallic Base
  const btnGrad = ctx.createLinearGradient(-radius * 0.7, -radius * 0.7, radius * 0.7, radius * 0.7);
  btnGrad.addColorStop(0.0, '#FDE68A'); // Pale gold highlight
  btnGrad.addColorStop(0.3, '#F59E0B'); // Warm amber gold
  btnGrad.addColorStop(0.7, '#D97706'); // Deep golden bronze
  btnGrad.addColorStop(1.0, '#78350F'); // Dark bronze shadow
  ctx.fillStyle = btnGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // 3. Dark Outer Button Rim
  ctx.strokeStyle = '#3D2005';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 4. Iconic Jujutsu High Swirl / Spiral Crest Pattern
  ctx.strokeStyle = '#451A03';
  ctx.lineWidth = Math.max(0.7, radius * 0.32);
  ctx.lineCap = 'round';
  ctx.beginPath();
  // Outer spiral arc
  ctx.arc(0, 0, radius * 0.60, 0.2, Math.PI * 1.35);
  ctx.stroke();
  // Inner swirl arc
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.32, Math.PI * 0.8, Math.PI * 2.2);
  ctx.stroke();

  // 5. Specular 1px White Glint
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-radius * 0.32, -radius * 0.32, Math.max(0.6, radius * 0.24), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}



