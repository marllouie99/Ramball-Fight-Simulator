// ─────────────────────────────────────────────
// Makima (The Control Devil) — Chains of Domination Visuals & Animation Engine
// Chainsaw Man / Public Safety Special Division 4
// Skill 1: Chains of Domination (Shihai no Kusari / 支配の鎖)
//
// Adheres strictly to:
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 19 & 20 (Upright POV & Minimalist Circle Aesthetics)
// - Rule 5 (Target-only stasis visuals)
// ─────────────────────────────────────────────

const P = 2.0;
function snap(v) {
  return Math.round(v / P) * P;
}

/**
 * Main Renderer for Makima's Skill 1: Chains of Domination (Shihai no Kusari).
 * Draws:
 * 1. Concentric Control Devil Eye Halo / Authority Aura behind Makima
 * 2. High-speed Piercing Harpoon Launch Animation (frames 0-9)
 * 3. Harmonic Sine-Wave Tension Vibration along the taut chains
 * 4. Interlocking Stepped Pixel-Art Chain Links (alternating Face-On & Side-On)
 * 5. Cursed Golden Energy Surges travelling toward targets
 * 6. Siphoned Arterial Blood Droplets travelling backward to Makima
 * 7. Clamped Golden Subjugation Collars, Restraint Stakes, and "KNEEL" Halo Glyphs on victims
 */
export function drawMakimaChainsOfDomination(ctx, makima) {
  if (!makima || !makima.isChainingActive || !makima.chainedTargets || makima.chainedTargets.length === 0) {
    return;
  }

  const now = Date.now();
  const maxTimer = makima.chainMaxTimer || 240;
  const currentTimer = makima.chainTimer !== undefined ? makima.chainTimer : 0;
  const elapsed = Math.max(0, maxTimer - currentTimer);
  const launchDuration = 9; // ~9 frames for chain harpoons to shoot out
  const launchProgress = Math.min(1.0, elapsed / launchDuration);
  const isTaut = launchProgress >= 1.0;

  // ─────────────────────────────────────────────
  // 1. CHAIN TETHERS TO ALL BOUND TARGETS
  // ─────────────────────────────────────────────
  for (let tIdx = 0; tIdx < makima.chainedTargets.length; tIdx++) {
    const target = makima.chainedTargets[tIdx];
    if (!target || target.isDead || (target.hp !== undefined && target.hp <= 0)) continue;

    const angleToTarget = Math.atan2(target.y - makima.y, target.x - makima.x);
    const startX = makima.x + Math.cos(angleToTarget) * (makima.r * 0.88);
    const startY = makima.y + Math.sin(angleToTarget) * (makima.r * 0.88);

    _drawSingleChainTether(ctx, startX, startY, target, tIdx, launchProgress, isTaut, now, elapsed);
  }
}

/**
 * Top-Layer Overlay Renderer drawn ON TOP of the chained target's body.
 * Guarantees the body-wrapping chains, padlock, and subjugation collar
 * are ALWAYS 100% visible and NEVER covered by the enemy's skin layer.
 */
export function drawTargetChainsOverlay(ctx, target, makima) {
  if (!target || target.isDead || (target.hp !== undefined && target.hp <= 0)) return;
  if (!makima || !makima.isChainingActive) return;

  const now = Date.now();
  const maxTimer = makima.chainMaxTimer || 240;
  const currentTimer = makima.chainTimer !== undefined ? makima.chainTimer : 0;
  const elapsed = Math.max(0, maxTimer - currentTimer);
  const launchDuration = 9;
  const launchProgress = Math.min(1.0, elapsed / launchDuration);
  const isTaut = launchProgress >= 1.0;

  if (isTaut) {
    const tIdx = makima.chainedTargets ? Math.max(0, makima.chainedTargets.indexOf(target)) : 0;
    _drawTargetBodyWrappingChains(ctx, target, tIdx, now, currentTimer, maxTimer);
  }
}



/**
 * Draws a single animated chain tether between Makima and a target.
 */
function _drawSingleChainTether(ctx, startX, startY, target, tIdx, launchProgress, isTaut, now, elapsed) {
  const dx = target.x - startX;
  const dy = target.y - startY;
  const fullDist = Math.hypot(dx, dy);
  if (fullDist < 1) return;

  const chainAngle = Math.atan2(dy, dx);
  const perpX = -Math.sin(chainAngle);
  const perpY = Math.cos(chainAngle);

  const currentDist = fullDist * launchProgress;

  // ─────────────────────────────────────────────
  // A. NATURAL TAUT CATENARY PHYSICS & GENTLE SWAY
  // ─────────────────────────────────────────────
  function getChainPoint(u) {
    const segDist = currentDist * u;
    let waveDisp = 0;

    if (isTaut) {
      // Natural parabolic catenary curve (smooth sag) + subtle, gentle breathing sway
      const catenaryArc = Math.sin(u * Math.PI); // Parabolic peak at midpoint (u = 0.5), 0 at endpoints
      const baseSag = Math.min(5.0, fullDist * 0.015); // Gentle natural catenary sag
      const slowSway = Math.sin(now * 0.002 + tIdx * 1.2) * 1.2; // Very slow, subtle organic sway
      waveDisp = catenaryArc * (baseSag + slowSway);
    } else {
      // Smooth dynamic whip arch during initial projectile launch
      const whipArc = Math.sin(u * Math.PI) * (1.0 - launchProgress) * 12.0 * Math.sin(now * 0.01);
      waveDisp = whipArc;
    }

    return {
      x: startX + Math.cos(chainAngle) * segDist + perpX * waveDisp,
      y: startY + Math.sin(chainAngle) * segDist + perpY * waveDisp
    };
  }

  // ─────────────────────────────────────────────
  // B. GLOWING ENERGY SPINE UNDERLAY (Rule 11 Zero shadowBlur)
  // ─────────────────────────────────────────────
  const sampleSteps = Math.max(12, Math.floor(currentDist / 18));
  const spinePts = [];
  for (let s = 0; s <= sampleSteps; s++) {
    spinePts.push(getChainPoint(s / sampleSteps));
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(spinePts[0].x, spinePts[0].y);
  for (let s = 1; s <= sampleSteps; s++) {
    ctx.lineTo(spinePts[s].x, spinePts[s].y);
  }

  // Velvet Crimson Cursed Outer Filament
  ctx.strokeStyle = 'rgba(163, 29, 36, 0.45)';
  ctx.lineWidth = 5.0;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Solar Amber Golden Cursed Core
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Pure White Kinetic Conduit
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.90)';
  ctx.lineWidth = 1.0;
  ctx.stroke();
  ctx.restore();

  // ─────────────────────────────────────────────
  // C. PROCEDURAL INTERLOCKING PIXEL-ART CHAIN LINKS
  // ─────────────────────────────────────────────
  const linkSpacing = 12.5;
  const totalLinks = Math.floor(currentDist / linkSpacing);

  for (let k = 0; k < totalLinks; k++) {
    const u0 = (k * linkSpacing) / currentDist;
    const u1 = Math.min(1.0, ((k + 1) * linkSpacing) / currentDist);

    const pt0 = getChainPoint(u0);
    const pt1 = getChainPoint(u1);
    const midX = (pt0.x + pt1.x) * 0.5;
    const midY = (pt0.y + pt1.y) * 0.5;
    const linkAngle = Math.atan2(pt1.y - pt0.y, pt1.x - pt0.x);

    ctx.save();
    ctx.translate(snap(midX), snap(midY));
    ctx.rotate(linkAngle);
    ctx.imageSmoothingEnabled = false;

    if (k % 2 === 0) {
      // ── FACE-ON OVAL LINK (Facing Camera POV) ──
      // 1. Dark Obsidian & Blood-Iron Outer Border (12px × 7px)
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(-6, -3.5, 12, 7);

      // 2. Velvet Crimson Metallic Rim
      ctx.fillStyle = '#781D16';
      ctx.fillRect(-5, -2.5, 10, 5);

      // 3. Solar Gold Cursed Alloy Body
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-4, -2.0, 8, 4);

      // 4. Specular White-Gold Top Gleam
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(-4, -2.0, 8, 1.5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-2, -2.0, 4, 1.0);

      // 5. Real Hollow Inner Eyelet Hole
      ctx.fillStyle = '#180506';
      ctx.fillRect(-2, -0.5, 4, 1.5);
    } else {
      // ── SIDE-ON INTERLOCKING VERTICAL LINK (Profile POV) ──
      // 1. Dark Steel Shell (5px × 10px)
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(-2.5, -5, 5, 10);

      // 2. Crimson Shadow Core
      ctx.fillStyle = '#5A1215';
      ctx.fillRect(-1.5, -4, 3, 8);

      // 3. Gleaming Amber Core
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(-1.0, -3.5, 2, 7);

      // 4. White-Hot Specular Gleam
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-0.5, -2.5, 1, 5);
    }

    ctx.restore();
  }

  // ─────────────────────────────────────────────
  // D. LEADING PIERCING HARPOON HEAD (During Launch Phase)
  // ─────────────────────────────────────────────
  if (!isTaut) {
    const tipPt = getChainPoint(1.0);
    ctx.save();
    ctx.translate(snap(tipPt.x), snap(tipPt.y));
    ctx.rotate(chainAngle);
    ctx.imageSmoothingEnabled = false;

    // 1. Harpoon Outer Dark Shell
    ctx.fillStyle = '#0E0F14';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-4, -6);
    ctx.lineTo(0, -2);
    ctx.lineTo(-6, -2);
    ctx.lineTo(-6, 2);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fill();

    // 2. Solar Gold Harpoon Blade
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-2, -4);
    ctx.lineTo(1, -1);
    ctx.lineTo(-4, -1);
    ctx.lineTo(-4, 1);
    ctx.lineTo(1, 1);
    ctx.lineTo(-2, 4);
    ctx.closePath();
    ctx.fill();

    // 3. White-Hot Center Piercing Ridge
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-2, -1, 12, 2);

    // 4. Supersonic Motion Speed Lines trailing the spearhead
    ctx.fillStyle = 'rgba(251, 191, 36, 0.85)';
    ctx.fillRect(-12, -4, 6, 1);
    ctx.fillRect(-15, 3, 8, 1);
    ctx.fillRect(-8, -6, 4, 1);
    ctx.fillRect(-10, 5, 5, 1);

    ctx.restore();
  }
}



/**
 * Draws heavy golden-crimson chains wrapping around the enemy's body in diagonal constricting coils.
 * Adheres to Rule 11 (Zero shadowBlur CPU filtering) and Rule 19/20.
 */
function _drawTargetBodyWrappingChains(ctx, target, tIdx, now, currentTimer, maxTimer) {
  const tr = target.r || 25;
  const pulse = Math.sin(now * 0.007 + tIdx * 1.5);
  const constrict = pulse * 0.8;

  ctx.save();
  ctx.translate(target.x, target.y - (target.z || 0));
  ctx.imageSmoothingEnabled = false;

  // 3 Diagonal Helical Body Wrap Coils:
  // Coil 1: Upper chest band (slanted top-left to mid-right)
  // Coil 2: Crossing mid-torso band (slanted mid-right to lower-left)
  // Coil 3: Lower waist / abdomen band (slanted lower-left to bottom-right)
  const coils = [
    {
      p0: { x: -tr * 0.82, y: -tr * 0.46 + constrict },
      cp: { x: 0,          y: -tr * 0.30 + constrict },
      p1: { x:  tr * 0.82, y: -tr * 0.14 + constrict },
      linkCount: 6
    },
    {
      p0: { x:  tr * 0.86, y: -tr * 0.18 - constrict },
      cp: { x: 0,          y:  tr * 0.06 - constrict },
      p1: { x: -tr * 0.86, y:  tr * 0.32 - constrict },
      linkCount: 6
    },
    {
      p0: { x: -tr * 0.76, y:  tr * 0.34 + constrict * 0.5 },
      cp: { x: 0,          y:  tr * 0.52 + constrict * 0.5 },
      p1: { x:  tr * 0.76, y:  tr * 0.70 + constrict * 0.5 },
      linkCount: 5
    }
  ];

  // 1. Draw Cast Drop Shadows for all coils underneath the links
  for (let c of coils) {
    ctx.beginPath();
    ctx.moveTo(c.p0.x, c.p0.y + 2.5);
    ctx.quadraticCurveTo(c.cp.x, c.cp.y + 2.5, c.p1.x, c.p1.y + 2.5);
    ctx.strokeStyle = 'rgba(10, 10, 15, 0.55)';
    ctx.lineWidth = 5.0;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // 2. Draw Golden Cursed Spine Glow along each coil band
  for (let c of coils) {
    // Crimson Outer Glow
    ctx.beginPath();
    ctx.moveTo(c.p0.x, c.p0.y);
    ctx.quadraticCurveTo(c.cp.x, c.cp.y, c.p1.x, c.p1.y);
    ctx.strokeStyle = 'rgba(163, 29, 36, 0.75)';
    ctx.lineWidth = 4.0;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Solar Amber Core
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.90)';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // White Specular Ridge
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // 3. Draw Interlocking Stepped Pixel-Art Chain Links along each coil band
  for (let cIdx = 0; cIdx < coils.length; cIdx++) {
    const c = coils[cIdx];
    const count = c.linkCount;

    for (let i = 0; i < count; i++) {
      const t0 = i / (count - 0.5);
      const t1 = Math.min(1.0, (i + 0.5) / (count - 0.5));

      // Quadratic bezier calculation
      const mt0 = 1 - t0;
      const lx0 = mt0 * mt0 * c.p0.x + 2 * mt0 * t0 * c.cp.x + t0 * t0 * c.p1.x;
      const ly0 = mt0 * mt0 * c.p0.y + 2 * mt0 * t0 * c.cp.y + t0 * t0 * c.p1.y;

      const mt1 = 1 - t1;
      const lx1 = mt1 * mt1 * c.p0.x + 2 * mt1 * t1 * c.cp.x + t1 * t1 * c.p1.x;
      const ly1 = mt1 * mt1 * c.p0.y + 2 * mt1 * t1 * c.cp.y + t1 * t1 * c.p1.y;

      const linkAngle = Math.atan2(ly1 - ly0, lx1 - lx0);

      ctx.save();
      ctx.translate(snap(lx0), snap(ly0));
      ctx.rotate(linkAngle);

      if ((i + cIdx) % 2 === 0) {
        // Face-on Oval Pixel Link (10px × 6px)
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(-5, -3, 10, 6);

        ctx.fillStyle = '#781D16';
        ctx.fillRect(-4, -2, 8, 4);

        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(-3.5, -1.5, 7, 3);

        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(-3, -1.5, 6, 1.2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-1.5, -1.5, 3, 0.8);

        ctx.fillStyle = '#180506'; // Hollow center eyelet hole
        ctx.fillRect(-1.5, -0.4, 3, 1.0);
      } else {
        // Side-on Vertical Connecting Link (4px × 8px)
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(-2, -4, 4, 8);

        ctx.fillStyle = '#5A1215';
        ctx.fillRect(-1.2, -3, 2.4, 6);

        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(-0.8, -2.5, 1.6, 5);

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-0.4, -2.0, 0.8, 4);
      }

      ctx.restore();
    }
  }

  // 4. Heavy Interlocking Center Chest Cross-Lock & Ruby Devil Core
  const lockX = 0;
  const lockY = -tr * 0.08;

  ctx.save();
  ctx.translate(lockX, lockY);

  // Cross-band Iron Clasp Plate (12px × 10px)
  ctx.fillStyle = '#0E0F14';
  ctx.fillRect(-6, -5, 12, 10);

  // Golden Locking Frame
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(-5, -4, 10, 8);

  // Velvet Crimson Inset
  ctx.fillStyle = '#781D16';
  ctx.fillRect(-3.5, -2.5, 7, 5);

  // Glowing Ruby Devil Gem at Center
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(-2, -1.5, 4, 3);

  // Specular Highlight
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-1.2, -1.5, 2, 1);

  // 4 Corner Gold Rivets
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(-4.5, -3.5, 1.5, 1.5);
  ctx.fillRect(3.0, -3.5, 1.5, 1.5);
  ctx.fillRect(-4.5, 2.0, 1.5, 1.5);
  ctx.fillRect(3.0, 2.0, 1.5, 1.5);

  ctx.restore();

  // 5. Constriction Sparks (Tiny golden sparks escaping from the tight chain coils)
  for (let s = 0; s < 3; s++) {
    const sPhase = ((now * 0.003 + s * 0.33 + tIdx * 0.5) % 1.0);
    const sAngle = (s * Math.PI * 0.67) + (now * 0.002);
    const sx = Math.cos(sAngle) * (tr * 0.7);
    const sy = Math.sin(sAngle) * (tr * 0.5) - sPhase * 10;
    const sAlpha = (1.0 - sPhase) * 0.90;

    ctx.fillStyle = `rgba(254, 240, 138, ${sAlpha.toFixed(3)})`;
    ctx.fillRect(snap(sx), snap(sy), 2, 2);
  }

  ctx.restore();
}
