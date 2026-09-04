// ─────────────────────────────────────────────
// YUJI ITADORI FIGHTER SKIN
// Color-theme approach: pink hair / skin / dark
// uniform — same simple block style as Gojo.
// ─────────────────────────────────────────────

import { CONFIG, getHandSize } from '../../core/config.js';
import { state } from '../../core/state.js';
import { isSuppressedByGetsuga } from '../../entities/fighter.js';

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
      console.warn('Failed to load Yuji pixel skin image at Assets/model/Yuji-PIXEL-SKIN.png', e);
      _yujiSkinImageLoading = false;
    };
    img.src = 'Assets/model/Yuji-PIXEL-SKIN.png?v=1';
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
  const isSuppressed = typeof fighter.areAttackEffectsSuppressed === 'function' ? fighter.areAttackEffectsSuppressed() : (isGojoDomainActive || isSuppressedByGetsuga(fighter));
  if (!isLowQuality && fighter.afterImages && fighter.afterImages.length > 0 && !isSuppressed) {
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

  // ── 2. Body Circle (Authentic Procedural Pixel Art) ──
  drawYujiPixelBody(ctx, r, isSukunaForm);

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

let _cachedFistNormalCanvas = null;
let _cachedFistSukunaCanvas = null;
let _cachedFistRadius = 0;

let _cachedYujiNormalCanvas = null;
let _cachedYujiSukunaCanvas = null;
let _cachedYujiR = 0;

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

function _renderFistToCanvas(destCtx, radius, skinColor) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  const P = 2.0;
  const gridR = Math.max(P * 2, radius);
  const steps = Math.ceil(gridR / P);
  const shadowColor = '#C99478';

  // Outer Dark Pixel Border Shell
  destCtx.fillStyle = '#0E0F14';
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= gridR + P * 0.75) {
        destCtx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // Inner Base Skin Tone
  destCtx.fillStyle = skinColor;
  const innerR = gridR - P * 0.4;
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR) {
        destCtx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // Knuckle Depth Shading
  destCtx.fillStyle = shadowColor;
  for (let gy = 0; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const dist = Math.hypot(gx * P, gy * P);
      if (dist <= innerR && (gy * P > innerR * 0.35 || gx * P < -innerR * 0.45)) {
        destCtx.fillRect(gx * P, gy * P, P, P);
      }
    }
  }

  // Knuckle Specular Glint Pixels
  destCtx.fillStyle = '#FFF2EB';
  const hx = Math.round(P * 0.5);
  const hy = Math.round(-innerR * 0.45);
  destCtx.fillRect(hx, hy, P, P);
  destCtx.fillRect(hx + P, hy, P, P);

  destCtx.restore();
}

function _drawFist(ctx, x, y, radius, skinColor, fighter) {
  ctx.save();

  const charge = fighter.blackFlashCharge || 0;
  const chargeMax = fighter.blackFlashThreshold || 4;
  const aura = (fighter._isWinnerReveal) ? 1.0 : (fighter.combatAuraOpacity || 0);
  const glow = Math.max(aura, (charge / chargeMax) * 0.85);

  // 1. CE glow around fist — fast texture blit instead of per-frame createRadialGradient
  const isLowQuality = (typeof state !== 'undefined' && (state.performanceMode || (state.qualityLevel && state.qualityLevel < 0.5)));
  const isSukunaForm = fighter.soulSwapActive || (fighter.soulSwapTransitionTimer > 0);
  if (!isLowQuality && (glow > 0.01 || fighter.blackFlashTimer > 0)) {
    _initYujiGlowCanvases();
    const activeGlow = fighter.blackFlashTimer > 0 ? 1.0 : glow;
    const glowCanvas = fighter.blackFlashTimer > 0 ? _bfGlowCanvas : (isSukunaForm ? _sukunaGlowCanvas : _blueGlowCanvas);

    if (glowCanvas) {
      const glowR = radius * 1.8;
      ctx.globalAlpha = Math.max(0, Math.min(1.0, activeGlow));
      ctx.drawImage(glowCanvas, x - glowR, y - glowR, glowR * 2, glowR * 2);
    }
  }

  // 2. Pre-rendered Stepped Pixel-Art Fist Body & Outer Manga Border (Zero Subpixel Aliasing)
  if (typeof document !== 'undefined') {
    if (!_cachedFistNormalCanvas || !_cachedFistSukunaCanvas || _cachedFistRadius !== radius) {
      _cachedFistRadius = radius;
      const size = Math.ceil((radius + 6) * 2);

      _cachedFistNormalCanvas = document.createElement('canvas');
      _cachedFistNormalCanvas.width = size;
      _cachedFistNormalCanvas.height = size;
      const fCtxNormal = _cachedFistNormalCanvas.getContext('2d');
      _renderFistToCanvas(fCtxNormal, radius, '#F0C090');

      _cachedFistSukunaCanvas = document.createElement('canvas');
      _cachedFistSukunaCanvas.width = size;
      _cachedFistSukunaCanvas.height = size;
      const fCtxSukuna = _cachedFistSukunaCanvas.getContext('2d');
      _renderFistToCanvas(fCtxSukuna, radius, '#C03030');
    }

    const fistCanvas = isSukunaForm ? _cachedFistSukunaCanvas : _cachedFistNormalCanvas;
    if (fistCanvas) {
      ctx.globalAlpha = 1.0;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(fistCanvas, x - fistCanvas.width / 2, y - fistCanvas.height / 2);
    }
  }

  ctx.restore();
}

/**
 * Procedural Pixel Art Render Function (Renders once to offscreen cache).
 */
function _renderYujiPixelBodyToCanvas(destCtx, r, isSukunaForm) {
  destCtx.save();
  destCtx.imageSmoothingEnabled = false;
  destCtx.translate(destCtx.canvas.width / 2, destCtx.canvas.height / 2);
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;
  const steps = Math.ceil((r + P) / P);

  // Hairline shape calculation: spiky jagged dusty pink-salmon fringe
  function getHairlineY(rx) {
    const nx = rx / r; // -1 to +1
    // Asymmetric spiky bangs across forehead
    const spikeWave = Math.abs(Math.sin((nx + 0.12) * Math.PI * 3.4));
    const centralExtension = (1.0 - Math.abs(nx) * 0.30);
    const spikeDepth = r * 0.28 * centralExtension * Math.pow(spikeWave, 1.15);
    return -r * 0.38 + spikeDepth;
  }

  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = snap(rx);
      const py = snap(ry);

      // Pixelated Black Stroke Border
      if (Math.hypot(rx + P, ry) > r || Math.hypot(rx - P, ry) > r || Math.hypot(rx, ry + P) > r || Math.hypot(rx, ry - P) > r) {
        destCtx.fillStyle = '#0E0F14';
        destCtx.fillRect(px, py, P, P);
        continue;
      }

      const hairlineY = getHairlineY(rx);
      const nx = rx / r;
      const absX = Math.abs(nx);

      // ──────────────────────────────────────────
      // ZONE 1: Spiky Pink-Salmon Hair (ry < hairlineY)
      // ──────────────────────────────────────────
      if (ry < hairlineY) {
        let col = isSukunaForm ? '#C44E58' : '#D9847A'; // Base pink-salmon
        if (ry < -r * 0.70) {
          col = isSukunaForm ? '#E86E78' : '#F2A49B'; // Top hair crown highlight
        } else if (ry < -r * 0.50 && Math.abs(rx) < r * 0.45) {
          col = isSukunaForm ? '#D45C66' : '#E6938A'; // Mid hair highlight
        } else if (ry > hairlineY - P * 2.2) {
          col = isSukunaForm ? '#8E2832' : '#B85E55'; // Bang tip shadow
        } else if (Math.abs(rx) > r * 0.72) {
          col = isSukunaForm ? '#9A303A' : '#C26D64'; // Side fringe shadow
        }

        // Sukuna dark root undertones if transformed
        if (isSukunaForm && ry > -r * 0.45 && ry < -r * 0.20 && Math.abs(rx) > r * 0.40) {
          col = '#1A1114'; // Dark Sukuna undercuts
        }

        destCtx.fillStyle = col;
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 2: Warm Peach Face Skin & Scars (hairlineY <= ry < r * 0.08)
      // ──────────────────────────────────────────
      else if (ry < r * 0.08) {
        let col = isSukunaForm ? '#E8B4A2' : '#F0C090';
        if (ry < hairlineY + P * 2.0) {
          col = isSukunaForm ? '#D09A88' : '#DBA878'; // Bang shadow
        } else if (absX > 0.72 || ry > 0) {
          col = isSukunaForm ? '#CE9684' : '#DCA272'; // Cheek / neck shadow
        }

        // Signature Brow Scar (diagonal slash)
        const browProg = (ry - (-r * 0.30)) / (r * 0.22);
        const browScarX = -r * 0.26 + (r * 0.28) * browProg;
        const isBrowScar = (ry >= -r * 0.30 && ry <= -r * 0.08 && Math.abs(rx - browScarX) <= P * 0.9);
        const isBrowScarHighlight = (ry >= -r * 0.30 && ry <= -r * 0.08 && (rx - browScarX) < -P * 0.8 && (rx - browScarX) > -P * 1.8);

        // Signature Chin Scar
        const chinProg = (ry - (r * 0.04)) / (r * 0.06);
        const chinScarX = -r * 0.06 + (r * 0.12) * chinProg;
        const isChinScar = (ry >= r * 0.04 && ry <= r * 0.08 && Math.abs(rx - chinScarX) <= P * 0.8);

        // Sukuna Facial Cursed Markings (Tattoos)
        let isSukunaMark = false;
        if (isSukunaForm) {
          if (ry >= -r * 0.26 && ry <= -r * 0.12 && absX <= 0.06) isSukunaMark = true;
          if (ry >= -r * 0.10 && ry <= r * 0.06 && (Math.abs(rx - r * 0.44) <= P * 0.9 || Math.abs(rx + r * 0.44) <= P * 0.9)) isSukunaMark = true;
          if (ry >= -r * 0.18 && ry <= -r * 0.14 && (Math.abs(rx - r * 0.34) <= r * 0.12 || Math.abs(rx + r * 0.34) <= r * 0.12)) isSukunaMark = true;
        }

        if (isSukunaMark) {
          destCtx.fillStyle = '#1A1116'; // Deep charcoal-black tattoo ink
        } else if (isBrowScar) {
          destCtx.fillStyle = '#944430'; // Signature dark crimson-brown scar
        } else if (isBrowScarHighlight) {
          destCtx.fillStyle = '#F5BCA6'; // Scar upper highlight edge
        } else if (isChinScar) {
          destCtx.fillStyle = '#944430'; // Chin scar
        } else {
          destCtx.fillStyle = col;
        }
        destCtx.fillRect(px, py, P, P);
      }
      // ──────────────────────────────────────────
      // ZONE 3: DETAILED RED HOODIE COWL & UNIFORM (ry >= r * 0.08)
      // ──────────────────────────────────────────
      else {
        // Button helper function: Circular metallic gold button with dark outer rim, inner swirl, and white specular glint
        function getButtonPixel(bx, by, btnCenterX, btnCenterY, btnRadius) {
          const dist = Math.hypot(bx - btnCenterX, by - btnCenterY);
          if (dist > btnRadius) return null;

          // Dark outer bronze/black rim
          if (dist >= btnRadius - P * 0.8) {
            return '#261204';
          }
          // Specular glint (1-2px bright white dot on upper-left)
          const glintDist = Math.hypot(bx - (btnCenterX - btnRadius * 0.38), by - (btnCenterY - btnRadius * 0.38));
          if (glintDist <= P * 1.1) {
            return '#FFFFFF';
          }
          // Inner swirl / emblem in center
          const innerDist = Math.hypot(bx - btnCenterX, by - btnCenterY);
          if (innerDist <= btnRadius * 0.42 && innerDist >= btnRadius * 0.18) {
            return '#6B340A';
          }
          // Center dot of swirl
          if (innerDist < btnRadius * 0.18) {
            return '#261204';
          }
          // Upper-left golden highlight body
          if ((bx - btnCenterX) + (by - btnCenterY) <= 0) {
            return '#F59E0B'; // Bright Amber Gold
          }
          // Lower-right shaded gold body
          return '#B45309'; // Rich Golden Bronze
        }

        // Button positions matching Reference Picture 1:
        // Button 1: Upper button on left vertical placket
        const b1X = -r * 0.14, b1Y = r * 0.24, b1R = r * 0.125;
        // Button 2: Lower button on left vertical placket
        const b2X = -r * 0.14, b2Y = r * 0.42, b2R = r * 0.125;
        // Button 3: Lower right button on navy jacket
        const b3X = r * 0.52, b3Y = r * 0.65, b3R = r * 0.125;

        // Priority 1: Check buttons
        const btn1Col = getButtonPixel(rx, ry, b1X, b1Y, b1R);
        const btn2Col = getButtonPixel(rx, ry, b2X, b2Y, b2R);
        const btn3Col = getButtonPixel(rx, ry, b3X, b3Y, b3R);

        if (btn1Col) {
          destCtx.fillStyle = btn1Col;
          destCtx.fillRect(px, py, P, P);
          continue;
        }
        if (btn2Col) {
          destCtx.fillStyle = btn2Col;
          destCtx.fillRect(px, py, P, P);
          continue;
        }
        if (btn3Col) {
          destCtx.fillStyle = btn3Col;
          destCtx.fillRect(px, py, P, P);
          continue;
        }

        // Top collar boundary curve: curves down in center from r * 0.08 to r * 0.16
        const cowlTopY = r * 0.08 + Math.max(0, (1 - Math.pow(absX / 0.45, 2)) * r * 0.08);
        const isThroatSkin = (ry < cowlTopY);

        // Red Cowl Region: from cowlTopY down to r * 0.54
        const isRedCowl = (!isThroatSkin && ry <= r * 0.54);

        // Left Overlapping Placket Flap: rx from -r * 0.28 to 0.0, ry from r * 0.14 to r * 0.55
        const isCowlPlacket = (rx >= -r * 0.28 && rx <= 0.0 && ry >= r * 0.14 && ry <= r * 0.55);
        const isCowlPlacketBorderL = (Math.abs(rx - (-r * 0.28)) <= P * 0.8 && ry >= r * 0.14 && ry <= r * 0.55);
        const isCowlPlacketBorderR = (Math.abs(rx - 0.0) <= P * 0.8 && ry >= r * 0.14 && ry <= r * 0.55);

        // Horizontal fold crease across red cowl at ry ~ r * 0.32
        const isCowlMiddleCrease = (Math.abs(ry - r * 0.32) <= P * 0.8 && !isCowlPlacket);
        const isCowlTopRim = (Math.abs(ry - cowlTopY) <= P * 0.8);
        const isCowlBottomSeam = (Math.abs(ry - r * 0.54) <= P * 0.8);

        // Navy Uniform Region (ry > r * 0.54)
        // Curved fold lines across navy torso
        const isNavyFold1 = (Math.abs(ry - (r * 0.65 + rx * 0.08)) <= P * 0.8 && rx <= r * 0.38);
        const isNavyFold1Hi = (Math.abs(ry - (r * 0.63 + rx * 0.08)) <= P * 0.8 && rx <= r * 0.38);
        const isNavyFold2 = (Math.abs(ry - (r * 0.77 + rx * 0.06)) <= P * 0.8 && rx <= r * 0.42);
        const isNavyFold2Hi = (Math.abs(ry - (r * 0.75 + rx * 0.06)) <= P * 0.8 && rx <= r * 0.42);

        if (isThroatSkin) {
          destCtx.fillStyle = isSukunaForm ? '#E8B4A2' : '#F0C090';
        } else if (isRedCowl) {
          if (isCowlPlacketBorderL || isCowlPlacketBorderR || isCowlTopRim || isCowlBottomSeam) {
            destCtx.fillStyle = '#1A0406'; // Dark black-crimson outline
          } else if (isCowlMiddleCrease) {
            destCtx.fillStyle = '#6E0E14'; // Dark red middle fold crease
          } else if (isCowlPlacket) {
            destCtx.fillStyle = '#C81E2B'; // Rich vertical flap red
          } else if (ry < r * 0.32) {
            // Upper Cowl Fold: Bright vivid red with top specular highlight
            let col = '#E52B38';
            if (ry < cowlTopY + P * 2.5) col = '#F44336';
            destCtx.fillStyle = col;
          } else {
            // Lower Cowl Fold: Deep rich crimson
            let col = '#B71C1C';
            if (absX > r * 0.70 || ry > r * 0.46) col = '#8A1018';
            destCtx.fillStyle = col;
          }
        } else {
          // Navy Jujutsu High Uniform
          if (isNavyFold1 || isNavyFold2) {
            destCtx.fillStyle = '#0E1322'; // Deep navy shadow crease
          } else if (isNavyFold1Hi || isNavyFold2Hi) {
            destCtx.fillStyle = '#334168'; // Lighter denim blue fold highlight
          } else {
            let col = '#1D253D'; // Midnight navy base
            if (absX > r * 0.70 || ry > r * 0.85) {
              col = '#101524';
            } else if (ry < r * 0.65 && absX < r * 0.30) {
              col = '#242E4A';
            }
            destCtx.fillStyle = col;
          }
        }
        destCtx.fillRect(px, py, P, P);
      }
    }
  }

  destCtx.restore();
}

/**
 * Draws Yuji Itadori's entire body circle model in authentic Pixel Art Style (Offscreen Cached).
 * Uses discrete stepped pixel grid rasterization matching Saitama and Ichigo.
 * Minimalist circle brawler aesthetic, upright front POV, faceless (Rule #19 compliant).
 */
export function drawYujiPixelBody(ctx, r, isSukunaForm = false) {
  if (typeof document === 'undefined') return;

  if (!_cachedYujiNormalCanvas || !_cachedYujiSukunaCanvas || _cachedYujiR !== r) {
    _cachedYujiR = r;
    const size = Math.ceil((r + 4) * 2);

    _cachedYujiNormalCanvas = document.createElement('canvas');
    _cachedYujiNormalCanvas.width = size;
    _cachedYujiNormalCanvas.height = size;
    const offCtxNormal = _cachedYujiNormalCanvas.getContext('2d');
    _renderYujiPixelBodyToCanvas(offCtxNormal, r, false);

    _cachedYujiSukunaCanvas = document.createElement('canvas');
    _cachedYujiSukunaCanvas.width = size;
    _cachedYujiSukunaCanvas.height = size;
    const offCtxSukuna = _cachedYujiSukunaCanvas.getContext('2d');
    _renderYujiPixelBodyToCanvas(offCtxSukuna, r, true);
  }

  const canvasToDraw = isSukunaForm ? _cachedYujiSukunaCanvas : _cachedYujiNormalCanvas;
  if (canvasToDraw) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvasToDraw, -canvasToDraw.width / 2, -canvasToDraw.height / 2);
    ctx.restore();
  }
}



