// ─────────────────────────────────────────────
// LAYLA MALEFIC CANNON WEAPON GRAPHICS
// Recreates Layla's Steampunk Energy Cannon with exact fidelity:
// - Sleek curved mahogany stock with flared gold buttplate
// - Top sweeping brass hammer horn & sight mirror post
// - Pressure gauge eye housing
// - Brass circular core housing with 4-wedge X aperture lens
// - Under-barrel glowing cyan heat vents
// - Ribbed neck collars & long split mahogany/gold barrel prongs
// - Central needle syringe emitter tip & crackling plasma lightning
// - Crisp cell-shaded black outlines
import { getHandSize } from '../../core/config.js';

export const LAYLA_WEAPON_COLORS = {
  woodDark: '#3D170A',
  woodMid: '#6B2B13',
  woodLight: '#943F1D',
  woodHighlight: '#B55428',
  goldDark: '#9E7437',
  goldMid: '#C29853',
  goldLight: '#E8C174',
  goldBright: '#FFF2B8',
  cyanCore: '#00E5FF',
  cyanGlow: '#80F5FF',
  cyanLight: '#E0FFFF',
  blackOutline: '#000000',
};

// ─────────────────────────────────────────────
// Pre-cached static gradient builders — run once, reused every frame.
// Dynamic position-independent gradients (relative to 0,0) are safe to cache.
let _cachedGradients = null;
function _buildGradients(ctx) {
  if (_cachedGradients) return _cachedGradients;
  const c = LAYLA_WEAPON_COLORS;
  const stock    = ctx.createLinearGradient(-53, 18, -15, -5);
  stock.addColorStop(0,    c.woodHighlight);
  stock.addColorStop(0.35, c.woodLight);
  stock.addColorStop(0.7,  c.woodMid);
  stock.addColorStop(1,    c.woodDark);

  const butt     = ctx.createLinearGradient(-53, 18, -46, 5);
  butt.addColorStop(0,   c.goldBright);
  butt.addColorStop(0.5, c.goldLight);
  butt.addColorStop(1,   c.goldDark);

  const rec      = ctx.createLinearGradient(-15, -8, 20, 8);
  rec.addColorStop(0, c.woodMid);
  rec.addColorStop(1, c.woodDark);

  const horn     = ctx.createLinearGradient(-25, -20, -5, -6);
  horn.addColorStop(0,   c.goldBright);
  horn.addColorStop(0.6, c.goldLight);
  horn.addColorStop(1,   c.goldDark);

  const rib      = ctx.createLinearGradient(22, -8, 30, 8);
  rib.addColorStop(0,   c.goldBright);
  rib.addColorStop(0.5, c.goldLight);
  rib.addColorStop(1,   c.goldDark);

  const syr      = ctx.createLinearGradient(30, -3, 62, 3);
  syr.addColorStop(0,   c.goldBright);
  syr.addColorStop(0.5, c.goldLight);
  syr.addColorStop(1,   c.goldDark);

  _cachedGradients = { stock, butt, rec, horn, rib, syr };
  return _cachedGradients;
}

export function drawLaylaGun(ctx, x, y, gunAngle, r = 25, options = {}) {
  if (typeof state !== 'undefined' && state.showSkinOnly) return;
  const recoil = options.recoil || 0;
  const isInUltimate = options.isInUltimate || false;
  const isPreview = options.isPreview || false;

  ctx.save();
  ctx.translate(x, y);
  
  if (!isPreview) {
    const shootCooldown = options.shootCooldown || 0;
    let braceY = 0;
    let braceAngle = 0;
    // Heavy weapon bracing: lower and tilt gun down when on cooldown/preparing next shot
    if (shootCooldown > 0) {
      const progress = Math.min(1.0, shootCooldown / 45);
      braceY = progress * 3.5;       // lower closer to hip
      braceAngle = progress * -0.08;  // tilt down slightly
    }
    ctx.translate(0, braceY);
    ctx.rotate(braceAngle);

    // Apply recoil kick angle & pushback
    const kickAngle = Math.sin(recoil * Math.PI / 2) * -0.12;
    ctx.rotate(gunAngle + kickAngle);
    if (Math.abs(gunAngle) > Math.PI / 2) {
      ctx.scale(1, -1);
    }
  } else {
    ctx.rotate(gunAngle);
  }

  // Base positioning offset relative to fighter circle edge
  const recoilOffset = Math.sin(recoil * Math.PI / 2) * 8;
  const scale = options.scale || 1.1; // Scale relative to radius
  
  if (!isPreview) {
    // Position gun slung across her waist/midsection
    ctx.translate(r * 0.15 - recoilOffset, r * 0.24);
  }

  ctx.scale(scale, scale);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const colors = LAYLA_WEAPON_COLORS;
  const grads  = _buildGradients(ctx);
  
  // Malefic Bomb Hit Buff - Empowered Weapon State
  const maleficBuffProgress = options.maleficBuffTimer > 0 ? options.maleficBuffTimer / 180 : 0;
  const isEmpowered = maleficBuffProgress > 0;
  
  const mainCyan = colors.cyanCore;
  const glowCyan = isEmpowered ? '#00E5FF' : (isInUltimate ? '#E0FFFF' : colors.cyanGlow);
  const lightCyan = isEmpowered ? '#FFFFFF' : (isInUltimate ? '#E0FFFF' : colors.cyanLight);

  // Time for animated cyan electric energy tip & core pulse
  const time = Date.now() * 0.005;
  
  // Weapon pulsates with volatile energy visually indicating extended attack range!
  const empowerPulse = isEmpowered ? (1.2 + Math.sin(Date.now() * 0.015) * 0.3) : 1.0;
  const pulse = (Math.sin(time * 3) * 0.12 + 1.0) * empowerPulse;
  const strokeW = 2.0;

  // Removed global shadowBlur here for extreme performance optimization.
  // We rely on the bright cyan glow colors on the vents and core to indicate the buff.

  // ─────────────────────────────────────────────
  // 1. STOCK (Shortened S-Curve Drop matching User's Drawing)
  // ─────────────────────────────────────────────
  // Shortened horizontally to make it compact and proportional:
  // Heel at x = -46 (was -60), toe at x = -53 (was -68).
  const stockGrad = ctx.createLinearGradient(-53, 18, -15, -5);
  stockGrad.addColorStop(0, colors.woodHighlight);
  stockGrad.addColorStop(0.35, colors.woodLight);
  stockGrad.addColorStop(0.7, colors.woodMid);
  stockGrad.addColorStop(1, colors.woodDark);

  ctx.beginPath();
  ctx.moveTo(-15, -5); // Top junction at receiver
  ctx.bezierCurveTo(-24, -5, -32, 4, -40, 5); // S-curve drop
  ctx.lineTo(-46, 5); // Horizontal extension at stock top ridge
  ctx.quadraticCurveTo(-49, 6, -48, 8); // Rounded heel corner
  ctx.lineTo(-53, 16); // Slanted buttplate line down to toe
  ctx.quadraticCurveTo(-53, 19, -50, 19); // Rounded toe corner
  ctx.bezierCurveTo(-36, 16, -26, 11, -15, 6); // Bottom edge swooping back up
  ctx.closePath();
  ctx.fillStyle = grads.stock;
  ctx.fill();
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = strokeW;
  ctx.stroke();

  // Upper Wood Grain Highlight Curve along S-curve top drop
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-16, -4);
  ctx.bezierCurveTo(-24, -4, -32, 5, -44, 6);
  ctx.stroke();

  // Flared Slanted Gold Metal Buttplate (Capping end of stock)
  const buttGrad = ctx.createLinearGradient(-53, 18, -46, 5);
  buttGrad.addColorStop(0, colors.goldBright);
  buttGrad.addColorStop(0.5, colors.goldLight);
  buttGrad.addColorStop(1, colors.goldDark);

  ctx.beginPath();
  ctx.moveTo(-46, 5);
  ctx.quadraticCurveTo(-49, 6, -48, 8);
  ctx.lineTo(-53, 16);
  ctx.quadraticCurveTo(-53, 19, -50, 19);
  ctx.lineTo(-46, 17);
  ctx.lineTo(-42, 7);
  ctx.closePath();
  ctx.fillStyle = grads.butt;
  ctx.fill();
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = strokeW;
  ctx.stroke();

  // Gold L-Shaped Bracket Frame on Receiver/Wrist Junction (Shortened to fit wrist)
  ctx.fillStyle = colors.goldLight;
  ctx.beginPath();
  ctx.moveTo(-8, -8);
  ctx.lineTo(-14, -8);
  ctx.lineTo(-14, -2);
  ctx.lineTo(-20, -2);
  ctx.lineTo(-20, 1);
  ctx.lineTo(-11, 1);
  ctx.lineTo(-11, -5);
  ctx.lineTo(-8, -5);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // ─────────────────────────────────────────────
  // 2. RECEIVER BODY & ORNATE DETAILS
  // ─────────────────────────────────────────────
  // Main Receiver Dark Mahogany Housing
  const recGrad = ctx.createLinearGradient(-15, -8, 20, 8);
  recGrad.addColorStop(0, colors.woodMid);
  recGrad.addColorStop(1, colors.woodDark);

  ctx.beginPath();
  ctx.moveTo(-15, -6);
  ctx.lineTo(20, -6);
  ctx.lineTo(20, 6);
  ctx.lineTo(-15, 6);
  ctx.closePath();
  ctx.fillStyle = grads.rec;
  ctx.fill();
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = strokeW;
  ctx.stroke();

  // Top Sweeping Brass Hammer Horn (Arching backward high over receiver)
  ctx.beginPath();
  ctx.moveTo(-5, -6);
  ctx.bezierCurveTo(-8, -14, -18, -20, -25, -17);
  ctx.bezierCurveTo(-20, -15, -12, -12, -8, -6);
  ctx.closePath();
  ctx.fillStyle = grads.horn;
  ctx.fill();
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = strokeW;
  ctx.stroke();

  // Top Brass Sight Post / Oval Mirror (Near barrel junction)
  ctx.fillStyle = colors.goldLight;
  ctx.fillRect(16, -15, 2, 9);
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = 0.9;
  ctx.strokeRect(16, -15, 2, 9);

  ctx.beginPath();
  ctx.ellipse(17, -17, 3, 4.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = colors.goldLight;
  ctx.fill();
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(17, -17, 1.8, 3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#FFEBE0'; // Mirror reflection face
  ctx.fill();

  // Pressure Gauge Eye Housing (Top-Left Receiver)
  ctx.beginPath();
  ctx.arc(-8, -8, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = colors.goldLight;
  ctx.fill();
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-8, -8, 3.0, 0, Math.PI * 2);
  ctx.fillStyle = '#FFF8F0'; // Lens face
  ctx.fill();

  // Gauge Needle & Markings
  ctx.strokeStyle = '#990000';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(-8, -8);
  ctx.lineTo(-6.8, -10.2);
  ctx.stroke();

  // Bottom Brass Trigger Guard & Ornate Curly Spur
  ctx.strokeStyle = colors.goldLight;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-11, 6);
  ctx.quadraticCurveTo(-15, 16, -5, 18);
  ctx.quadraticCurveTo(3, 14, 2, 6);
  ctx.stroke();
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // Ornate Curly Rear Spur on Trigger Guard
  ctx.strokeStyle = colors.goldLight;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-10, 14);
  ctx.quadraticCurveTo(-16, 18, -14, 23);
  ctx.quadraticCurveTo(-11, 25, -9, 21);
  ctx.stroke();
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Trigger Blade inside Guard
  ctx.fillStyle = colors.goldMid;
  ctx.beginPath();
  ctx.moveTo(-5, 6);
  ctx.quadraticCurveTo(-7, 12, -3, 14);
  ctx.lineTo(-2, 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // ─────────────────────────────────────────────
  // 3. CYAN ENERGY CORE (Center Circle & 4-Wedge X Aperture)
  // ─────────────────────────────────────────────
  const coreX = 0;
  const coreY = 1;
  const coreR = 10;

  // Outer Brass Housing Ring
  const ringGrad = ctx.createRadialGradient(coreX - 3, coreY - 3, 2, coreX, coreY, coreR);
  ringGrad.addColorStop(0, colors.goldBright);
  ringGrad.addColorStop(0.5, colors.goldLight);
  ringGrad.addColorStop(1, colors.goldDark);

  ctx.beginPath();
  ctx.arc(coreX, coreY, coreR, 0, Math.PI * 2);
  ctx.fillStyle = ringGrad;
  ctx.fill();
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = strokeW;
  ctx.stroke();

  // Inner Cyan Glow Lens
  ctx.save();
  const cyanGrad = ctx.createRadialGradient(coreX, coreY, 0, coreX, coreY, coreR - 2.5);
  cyanGrad.addColorStop(0, lightCyan);
  cyanGrad.addColorStop(0.35, glowCyan);
  cyanGrad.addColorStop(0.8, mainCyan);
  cyanGrad.addColorStop(1, '#004D57');

  ctx.beginPath();
  ctx.arc(coreX, coreY, (coreR - 2.5) * pulse, 0, Math.PI * 2);
  ctx.fillStyle = cyanGrad;
  ctx.fill();
  ctx.restore();

  // 4 Golden Brass Wedges forming X-Aperture (matching reference image!) — batched
  ctx.fillStyle = colors.goldLight;
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = 0.8;
  ctx.save();
  ctx.translate(coreX, coreY);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i + Math.PI / 4;
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, coreR - 2.5, angle - Math.PI / 6, angle + Math.PI / 6);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Center Sparkle Highlight Dot
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(coreX, coreY, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // ─────────────────────────────────────────────
  // 4. UNDER-BARREL COOLING VENTS
  // ─────────────────────────────────────────────
  // 3 Vertical Cyan Glowing Heat Vent Bars attached below receiver
  ctx.fillStyle = mainCyan;
  ctx.beginPath();
  for (let i = 0; i < 3; i++) {
    const vx = 11 + i * 4;
    ctx.rect(vx, 6, 2.2, 6);
  }
  ctx.fill();

  // Brass Frame enclosing the vents
  ctx.strokeStyle = colors.goldLight;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(10, 6, 14, 6);
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = 0.9;
  ctx.strokeRect(10, 6, 14, 6);

  // ─────────────────────────────────────────────
  // 5. RIBBED BARREL COLLAR RINGS
  // ─────────────────────────────────────────────
  const ribX = 22;
  const ribW = 8;
  const ribGrad = ctx.createLinearGradient(ribX, -8, ribX + ribW, 8);
  ribGrad.addColorStop(0, colors.goldBright);
  ribGrad.addColorStop(0.5, colors.goldLight);
  ribGrad.addColorStop(1, colors.goldDark);

  // Concentric Rings — reuse cached gradient
  for (let i = 0; i < 3; i++) {
    const rx = ribX + i * 2.8;
    ctx.fillStyle = grads.rib;
    ctx.fillRect(rx, -7, 2.2, 14);
    ctx.strokeStyle = colors.blackOutline;
    ctx.lineWidth = 0.9;
    ctx.strokeRect(rx, -7, 2.2, 14);
  }

  // ─────────────────────────────────────────────
  // 6. FRONT MUZZLE (Long Split Prongs & Needle Syringe Emitter)
  // ─────────────────────────────────────────────
  const prongStart = 30;
  const prongEnd = 76;

  // Base Collar holding the prongs
  ctx.fillStyle = colors.goldLight;
  ctx.fillRect(prongStart - 1, -8, 5, 16);
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = strokeW;
  ctx.strokeRect(prongStart - 1, -8, 5, 16);

  // Wood bases of top and bottom prongs — batched
  ctx.fillStyle = colors.woodDark;
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = strokeW;
  ctx.beginPath();
  // top prong base
  ctx.moveTo(prongStart, -8);
  ctx.lineTo(prongEnd, -9);
  ctx.lineTo(prongEnd - 4, -3);
  ctx.lineTo(prongStart, -3);
  ctx.closePath();
  // bottom prong base
  ctx.moveTo(prongStart, 8);
  ctx.lineTo(prongEnd, 9);
  ctx.lineTo(prongEnd - 4, 3);
  ctx.lineTo(prongStart, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Brass armor plates on top and bottom prongs — batched
  ctx.fillStyle = colors.goldLight;
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  // top brass plate
  ctx.moveTo(prongStart, -8);
  ctx.lineTo(prongEnd, -9);
  ctx.lineTo(prongEnd - 8, -6);
  ctx.lineTo(prongStart, -6);
  ctx.closePath();
  // bottom brass plate
  ctx.moveTo(prongStart, 8);
  ctx.lineTo(prongEnd, 9);
  ctx.lineTo(prongEnd - 8, 6);
  ctx.lineTo(prongStart, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // --- CENTRAL NEEDLE SYRINGE EMITTER BARREL ---
  // Syringe Base Cylinder
  const syrGrad = ctx.createLinearGradient(prongStart, -3, 62, 3);
  syrGrad.addColorStop(0, colors.goldBright);
  syrGrad.addColorStop(0.5, colors.goldLight);
  syrGrad.addColorStop(1, colors.goldDark);

  ctx.beginPath();
  ctx.moveTo(prongStart, -3);
  ctx.lineTo(48, -2.5);
  ctx.lineTo(60, -1.2);
  ctx.lineTo(65, 0);
  ctx.lineTo(60, 1.2);
  ctx.lineTo(48, 2.5);
  ctx.lineTo(prongStart, 3);
  ctx.closePath();
  ctx.fillStyle = grads.syr;
  ctx.fill();
  ctx.strokeStyle = colors.blackOutline;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Inner Syringe Core Groove
  ctx.fillStyle = mainCyan;
  ctx.fillRect(36, -1, 16, 2);
  // Needle Emitter Tip Point
  ctx.strokeStyle = colors.goldLight;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(60, 0);
  ctx.lineTo(67, 0);
  ctx.stroke();

  // ─────────────────────────────────────────────
  // 7. CRACKLING CYAN PLASMA LIGHTNING BEAM
  // ─────────────────────────────────────────────
  if (!isPreview) {
    ctx.save();
    ctx.translate(67, 0);

    // Firing Muzzle Blast/Attack Flare (When Recoil is active)
    if (recoil > 0.05) {
      ctx.save();
      ctx.translate(6, 0);
      
      const blastSize = recoil * 34; // Up to 34px radius blast
      const blastAlpha = recoil;
      
      // Expanding shockwave ring
      ctx.strokeStyle = `rgba(0, 229, 255, ${blastAlpha * 0.85})`;
      ctx.lineWidth = 2.5 * recoil;
      ctx.beginPath();
      ctx.arc(0, 0, blastSize * 0.7, 0, Math.PI * 2);
      ctx.stroke();
      
      // Jagged 4-pointed energy star blast
      ctx.fillStyle = `rgba(224, 255, 255, ${blastAlpha})`;
      ctx.strokeStyle = `rgba(0, 229, 255, ${blastAlpha})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(blastSize, 0);
      ctx.quadraticCurveTo(0, 0, 0, -blastSize);
      ctx.quadraticCurveTo(0, 0, -blastSize, 0);
      ctx.quadraticCurveTo(0, 0, 0, blastSize);
      ctx.quadraticCurveTo(0, 0, blastSize, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Hot-white core flash
      ctx.fillStyle = `rgba(255, 255, 255, ${blastAlpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, blastSize * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Muzzle Flare Soft Aura Glow
    const glowGrad = ctx.createRadialGradient(0, 0, 1, 8, 0, 18);
    glowGrad.addColorStop(0, lightCyan);
    glowGrad.addColorStop(0.4, `rgba(0, 229, 255, 0.6)`);
    glowGrad.addColorStop(1, 'rgba(0, 229, 255, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(6, 0, 18, 0, Math.PI * 2);
    ctx.fill();

    const f1 = Math.sin(time * 9) * 3.5;
    const f2 = Math.cos(time * 13) * 4.2;

    // Outer Cyan Plasma Wave
    ctx.strokeStyle = mainCyan;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(8, -3 + f1);
    ctx.lineTo(16, 4 + f2);
    ctx.lineTo(25, -2 + f1 * 0.6);
    ctx.lineTo(36, 2 + f2 * 0.4);
    ctx.lineTo(48, 0);
    ctx.stroke();

    // Inner Bright White-Cyan Core Beam
    ctx.strokeStyle = lightCyan;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(8, -3 + f1);
    ctx.lineTo(16, 4 + f2);
    ctx.lineTo(25, -2 + f1 * 0.6);
    ctx.lineTo(36, 2 + f2 * 0.4);
    ctx.lineTo(48, 0);
    ctx.stroke();

    // Top Lightning Fork
    ctx.strokeStyle = lightCyan;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(8, -3 + f1);
    ctx.lineTo(14, -8 + f2);
    ctx.lineTo(20, -5 + f1);
    ctx.stroke();

    // Bottom Lightning Fork
    ctx.beginPath();
    ctx.moveTo(16, 4 + f2);
    ctx.lineTo(22, 9 + f1);
    ctx.lineTo(28, 6 + f2);
    ctx.stroke();

    ctx.restore(); // Restore lightning translate(67, 0) before drawing hands!
  }

  // ─────────────────────────────────────────────
  // 8. LAYLA'S GLOVED HANDS (Gripping Cannon)
  // ─────────────────────────────────────────────
  if (options.drawHands || !isPreview) {
    const gloveLeather = '#5D4037'; // Rich Leather Brown
    const gloveStrap = '#3E2723';   // Darker leather trim
    const cuffGold = '#E5BA73';

    // Scale-compensated hand radius (matching other fighters exactly in visual size)
    const handRadius = getHandSize(6.5) / scale;
    const cuffW = handRadius * 1.8;
    const cuffH = handRadius * 0.95;

    // --- Back Hand (Right Hand holding Trigger / Grip at x = -4, y = 6) ---
    ctx.save();
    ctx.translate(-4, 6);

    // Glove Cuff
    ctx.fillStyle = gloveStrap;
    ctx.fillRect(-cuffW / 2, -cuffH / 2, cuffW, cuffH);
    ctx.fillStyle = cuffGold;
    ctx.fillRect(-cuffW / 2, -cuffH / 2, cuffW, cuffH * 0.3);
    ctx.strokeStyle = colors.blackOutline;
    ctx.lineWidth = 0.9;
    ctx.strokeRect(-cuffW / 2, -cuffH / 2, cuffW, cuffH);

    // Hand Palm & Fingers gripping (Leather Brown Glove)
    ctx.fillStyle = gloveLeather;
    ctx.beginPath();
    ctx.arc(0, cuffH / 2, handRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.blackOutline;
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.restore();

    // --- Front Hand (Left Hand supporting under Front Barrel at x = 24, y = 6) ---
    ctx.save();
    ctx.translate(24, 6);

    // Glove Cuff
    ctx.fillStyle = gloveStrap;
    ctx.fillRect(-cuffW / 2, -cuffH / 2, cuffW, cuffH);
    ctx.fillStyle = cuffGold;
    ctx.fillRect(-cuffW / 2, -cuffH / 2, cuffW, cuffH * 0.3);
    ctx.strokeStyle = colors.blackOutline;
    ctx.lineWidth = 0.9;
    ctx.strokeRect(-cuffW / 2, -cuffH / 2, cuffW, cuffH);

    // Hand Palm & Fingers gripping from below (Leather Brown Glove)
    ctx.fillStyle = gloveLeather;
    ctx.beginPath();
    ctx.arc(0, cuffH / 2, handRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.blackOutline;
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore(); // Restore translate/scale
}
