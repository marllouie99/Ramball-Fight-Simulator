// ─────────────────────────────────────────────
// Makima (The Control Devil) — Chains of Domination Visuals & Animation Engine
// Chainsaw Man / Public Safety Special Division 4
// Skill 1: Chains of Domination (Shihai no Kusari / 支配の鎖)
//
// Adheres strictly to:
// - Rule 11 (Zero shadowBlur CPU Performance Preservation)
// - Rule 19 & 20 (Upright POV & Minimalist Circle Aesthetics)
// - Rule 5 (Target-only stasis visuals)
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { spawnSparks, spawnImpactFlash } from '../particles/sparkEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

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
/**
 * Resolves Makima's chain launch duration in frames and projectile speed.
 * Gives strict priority to `cfg.chainsThrowSpeed` when set, so user adjustments
 * directly govern throw speed without being overridden by default launch frames.
 *
 * Supports:
 * - Speed scale factors (<= 2.0, e.g. 0.10 => 10% speed / 4.5px/frame => ~93 frames, 0.5 => ~19 frames, 1.0 => ~9 frames)
 * - Direct px/frame values (> 2.0, e.g. 10 => 42 frames, 20 => 21 frames, 45 => 9 frames)
 * - Explicit frame overrides (via cfg.chainsLaunchFrames if chainsThrowSpeed is not set)
 */
export function resolveMakimaChainsSpeed(cfg, range = 420) {
  const c = cfg || {};
  let throwSpeed = c.chainsThrowSpeed !== undefined && c.chainsThrowSpeed !== null ? Number(c.chainsThrowSpeed) : null;
  if (throwSpeed === null && c.chainsSpeed !== undefined && c.chainsSpeed !== null) {
    throwSpeed = Number(c.chainsSpeed);
  }

  if (throwSpeed !== null && !isNaN(throwSpeed) && throwSpeed > 0) {
    // If <= 2.0 (like 0.10, 0.25, 0.5, 1.0), treat as speed multiplier of standard 45px/frame
    // If > 2.0 (like 10, 20, 45, 84), treat as direct projectile velocity in px/frame
    const effectivePxPerFrame = throwSpeed <= 2.0 ? (throwSpeed * 45.0) : throwSpeed;
    const launchFrames = Math.max(2, Math.min(180, Math.round(range / effectivePxPerFrame)));
    return {
      throwSpeed,
      effectivePxPerFrame,
      launchFrames
    };
  }

  if (c.chainsLaunchFrames !== undefined && c.chainsLaunchFrames !== null) {
    const lf = Number(c.chainsLaunchFrames);
    if (!isNaN(lf) && lf > 0) {
      const launchFrames = Math.max(2, Math.min(180, Math.round(lf)));
      return {
        throwSpeed: range / launchFrames,
        effectivePxPerFrame: range / launchFrames,
        launchFrames
      };
    }
  }

  return {
    throwSpeed: 45.0,
    effectivePxPerFrame: 45.0,
    launchFrames: 9
  };
}

/**
 * Computes the exact real-time world coordinates where Makima's Chains of Domination
 * emerge from her left hand on the left side of her body in front (Layer 3).
 *
 * Dynamically adjusts to:
 * 1. Makima's real-time position (makima.x, makima.y) so chains never cut off or detach when she moves
 * 2. Left hand dynamic shift / grip position during prepare, throw, and tether
 * 3. Screen orientation flip (facing left vs facing right)
 */
export function getMakimaChainOrigin(makima, targetAngle = null, now = Date.now()) {
  if (!makima) return { x: 0, y: 0 };
  const r = makima.r || 25;

  const isPreparing = Boolean(makima.isPreparingChain || (makima.chainWindupTimer && makima.chainWindupTimer > 0));
  const isThrowing = Boolean(makima.isThrowingChain || (makima.chainThrowAnimTimer && makima.chainThrowAnimTimer > 0));
  const isTethering = Boolean(makima.isChainingActive);

  let aimAngle = (makima.gunAngle !== undefined && makima.gunAngle !== null) ? makima.gunAngle : (makima.angle || 0);
  if (!isThrowing && targetAngle !== null && targetAngle !== undefined) {
    aimAngle = targetAngle;
  } else if (targetAngle !== null && targetAngle !== undefined && (makima.chainLockedAimAngle === undefined || makima.chainLockedAimAngle === null)) {
    aimAngle = targetAngle;
  }

  const facingLeft = Math.abs(aimAngle) > Math.PI / 2;
  const flipSign = facingLeft ? -1 : 1;

  let pullBackX = 0;
  let pullBackY = 0;

  if (isPreparing) {
    const windupMax = makima.chainWindupMax || 14;
    const curTimer = makima.chainWindupTimer || 0;
    const p = Math.min(1.0, Math.max(0.0, 1.0 - (curTimer / windupMax)));
    pullBackX = -3.5 * Math.sin(p * Math.PI * 0.5);
    pullBackY = -1.0 * Math.sin(p * Math.PI * 0.5);
  } else if (isThrowing) {
    const maxThrow = makima.chainThrowAnimMax || 22;
    const curTimer = makima.chainThrowAnimTimer || 0;
    const throwProgress = Math.min(1.0, Math.max(0.0, 1.0 - (curTimer / maxThrow)));
    if (throwProgress < 0.45) {
      const t = Math.sin((throwProgress / 0.45) * Math.PI);
      pullBackX = 5.0 * t;
      pullBackY = -0.5 * t;
    } else {
      pullBackX = -1.5;
      pullBackY = 0;
    }
  } else if (isTethering) {
    pullBackX = -2.0 + Math.sin(now * 0.015) * 0.5;
    pullBackY = 0;
  }

  // Left hand on left side at -r * 0.95 in front, with +5.0px forward link extension along +X
  const linkOffset = 5.0;
  const localX = snap(-r * 0.95 + pullBackX) + linkOffset;
  const localY = snap(r * 0.04 + pullBackY) * flipSign;

  const cosA = Math.cos(aimAngle);
  const sinA = Math.sin(aimAngle);

  return {
    x: makima.x + cosA * localX - sinA * localY,
    y: makima.y + sinA * localX + cosA * localY
  };
}

export function drawMakimaChainsOfDomination(ctx, makima) {
  if (!makima || !makima.isChainingActive || !makima.chainedTargets || makima.chainedTargets.length === 0) {
    return;
  }
  const isSuppressed = Boolean(
    makima.isTargetOfAmbush || 
    (typeof makima.areAttackEffectsSuppressed === 'function' && makima.areAttackEffectsSuppressed())
  );
  if (isSuppressed) return;

  const now = Date.now();
  const maxTimer = makima.chainMaxTimer || 240;
  const currentTimer = makima.chainTimer !== undefined ? makima.chainTimer : 0;
  const elapsed = Math.max(0, maxTimer - currentTimer);
  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
  const launchDuration = makima.chainsLaunchFrames || resolveMakimaChainsSpeed(cfg, 420).launchFrames;
  const launchProgress = Math.min(1.0, elapsed / launchDuration);
  const isTaut = launchProgress >= 1.0;

  // ─────────────────────────────────────────────
  // 1. CHAIN TETHERS TO ALL BOUND TARGETS
  // ─────────────────────────────────────────────
  for (let tIdx = 0; tIdx < makima.chainedTargets.length; tIdx++) {
    const target = makima.chainedTargets[tIdx];
    if (!target || target.isDead || (target.hp !== undefined && target.hp <= 0)) continue;

    const angleToTarget = Math.atan2(target.y - makima.y, target.x - makima.x);
    // Dynamically anchor chain base to Makima's moving hand on every frame
    const origin = getMakimaChainOrigin(makima, angleToTarget, now);
    const startX = origin.x;
    const startY = origin.y;

    _drawSingleChainTether(ctx, startX, startY, target, tIdx, launchProgress, isTaut, now, elapsed);
  }
}

/**
 * Renders Makima's Missed Chains of Domination shot when no targets were caught in the line of fire.
 * Draws the thrown chain extending rapidly out to max range and smoothly dissolving/retracting based on throw speed.
 */
export function drawMakimaMissedChains(ctx, makima) {
  if (!makima || !makima.activeMissedChains || makima.activeMissedChains.length === 0) return;
  const isSuppressed = Boolean(
    makima.isTargetOfAmbush || 
    (typeof makima.areAttackEffectsSuppressed === 'function' && makima.areAttackEffectsSuppressed())
  );
  if (isSuppressed) return;

  const now = Date.now();
  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};

  for (let mc of makima.activeMissedChains) {
    if (!mc || mc.life <= 0) continue;

    const maxLife = mc.maxLife || 18;
    const launchFrames = mc.launchFrames || makima.chainsLaunchFrames || resolveMakimaChainsSpeed(cfg, mc.range || 420).launchFrames;
    const extendFraction = Math.min(0.92, Math.max(0.18, launchFrames / maxLife));

    const progress = Math.max(0, Math.min(1.0, 1.0 - (mc.life / maxLife)));
    let extendPct = 0;
    let alpha = 1.0;

    // Fast throw out in initial launch phase
    if (progress < extendFraction) {
      extendPct = Math.pow(progress / extendFraction, 0.85);
      alpha = 1.0;
    } else {
      // Retract & dissolve in remaining phase
      const pRetract = (progress - extendFraction) / (1.0 - extendFraction);
      extendPct = 1.0 - Math.pow(pRetract, 1.3) * 0.45;
      alpha = Math.max(0, 1.0 - pRetract);
    }

    const currentDist = (mc.range || 420) * extendPct;
    if (currentDist < 6) continue;

    const chainAngle = (mc.angle !== undefined && mc.angle !== null) ? mc.angle : (makima.gunAngle !== undefined ? makima.gunAngle : (makima.angle || 0));
    // Dynamically anchor missed chain base to Makima's moving hand on every frame
    const origin = getMakimaChainOrigin(makima, chainAngle, now);
    const startX = origin.x;
    const startY = origin.y;
    mc.startX = startX;
    mc.startY = startY;
    const perpX = -Math.sin(chainAngle);
    const perpY = Math.cos(chainAngle);

    function getMissedChainPoint(u) {
      const segDist = currentDist * u;
      const whipArc = Math.sin(u * Math.PI) * (1.0 - progress) * 9.0 * Math.sin(now * 0.015);
      return {
        x: startX + Math.cos(chainAngle) * segDist + perpX * whipArc,
        y: startY + Math.sin(chainAngle) * segDist + perpY * whipArc
      };
    }

    // 1. Glowing Energy Spine
    const sampleSteps = Math.max(8, Math.floor(currentDist / 18));
    const spinePts = [];
    for (let s = 0; s <= sampleSteps; s++) {
      spinePts.push(getMissedChainPoint(s / sampleSteps));
    }

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(spinePts[0].x, spinePts[0].y);
    for (let s = 1; s <= sampleSteps; s++) {
      ctx.lineTo(spinePts[s].x, spinePts[s].y);
    }

    ctx.strokeStyle = `rgba(163, 29, 36, ${(alpha * 0.45).toFixed(3)})`;
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.strokeStyle = `rgba(245, 158, 11, ${(alpha * 0.75).toFixed(3)})`;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.90).toFixed(3)})`;
    ctx.lineWidth = 1.0;
    ctx.stroke();
    ctx.restore();

    // 2. Interlocking Stepped Pixel-Art Chain Links
    const linkSpacing = 12.5;
    const totalLinks = Math.floor(currentDist / linkSpacing);

    for (let k = 0; k < totalLinks; k++) {
      const u0 = (k * linkSpacing) / currentDist;
      const u1 = Math.min(1.0, ((k + 1) * linkSpacing) / currentDist);
      const pt0 = getMissedChainPoint(u0);
      const pt1 = getMissedChainPoint(u1);
      const midX = (pt0.x + pt1.x) * 0.5;
      const midY = (pt0.y + pt1.y) * 0.5;
      const lAngle = Math.atan2(pt1.y - pt0.y, pt1.x - pt0.x);

      ctx.save();
      ctx.translate(snap(midX), snap(midY));
      ctx.rotate(lAngle);
      ctx.globalAlpha = alpha;
      ctx.imageSmoothingEnabled = false;

      if (k % 2 === 0) {
        // Face-on oval link
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(-6, -3.5, 12, 7);
        ctx.fillStyle = '#781D16';
        ctx.fillRect(-5, -2.5, 10, 5);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(-4, -2.0, 8, 4);
        ctx.fillStyle = '#FEF08A';
        ctx.fillRect(-4, -2.0, 8, 1.5);
        ctx.fillStyle = '#180506';
        ctx.fillRect(-2, -0.5, 4, 1.5);
      } else {
        // Side-on profile link
        ctx.fillStyle = '#0E0F14';
        ctx.fillRect(-2.5, -5, 5, 10);
        ctx.fillStyle = '#5A1215';
        ctx.fillRect(-1.5, -4, 3, 8);
        ctx.fillStyle = '#FBBF24';
        ctx.fillRect(-1.0, -3.5, 2, 7);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-0.5, -2.5, 1, 5);
      }

      ctx.restore();
    }

    // 3. Piercing Harpoon Head at Tip
    const tipPt = getMissedChainPoint(1.0);
    ctx.save();
    ctx.translate(snap(tipPt.x), snap(tipPt.y));
    ctx.rotate(chainAngle);
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;

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

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-2, -1, 12, 2);

    ctx.restore();
  }
}

/**
 * Top-Layer Overlay Renderer drawn ON TOP of the chained target's body.
 * Guarantees the body-wrapping chains, padlock, and subjugation collar
 * are ALWAYS 100% visible and NEVER covered by the enemy's skin layer.
 */
export function drawTargetChainsOverlay(ctx, target, makima = null) {
  if (!target || target.isDead || (target.hp !== undefined && target.hp <= 0)) return;
  if (!target.isChainedByMakima && (!makima || !makima.isChainingActive)) return;

  const now = Date.now();
  const maxTimer = (makima && makima.chainMaxTimer) ? makima.chainMaxTimer : 240;
  const currentTimer = (makima && makima.chainTimer !== undefined) ? makima.chainTimer : 120;
  const tIdx = (makima && makima.chainedTargets) ? Math.max(0, makima.chainedTargets.indexOf(target)) : 0;

  _drawTargetBodyWrappingChains(ctx, target, tIdx, now, currentTimer, maxTimer);
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

// ─────────────────────────────────────────────
// SKILL 2: ANGEL'S ARMORY (1000-YEAR LIFE-SPAN SPEAR / SEN-NEN NO YARI)
// AUTHENTIC HIGH-DEFINITION PIXEL ART ENGINE
// ─────────────────────────────────────────────

/**
 * Pixel Art Core Helper Functions.
 * Standardizes 2.0px pixel units with integer-aligned rasterization.
 */
function px(ctx, x, y, fill) {
  if (!fill) return;
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x / P) * P, Math.round(y / P) * P, P, P);
}

function pxRect(ctx, x, y, w, h, fill) {
  if (!fill) return;
  ctx.fillStyle = fill;
  ctx.fillRect(Math.round(x / P) * P, Math.round(y / P) * P, Math.round(w / P) * P, Math.round(h / P) * P);
}

function pxDiamond(ctx, cx, cy, r, fill, border = null) {
  const step = P;
  if (border) {
    const br = r + step;
    ctx.fillStyle = border;
    for (let dy = -br; dy <= br; dy += step) {
      const span = Math.round((br - Math.abs(dy)) / step) * step;
      ctx.fillRect(Math.round((cx - span) / step) * step, Math.round((cy + dy) / step) * step, span * 2 + step, step);
    }
  }
  ctx.fillStyle = fill;
  for (let dy = -r; dy <= r; dy += step) {
    const span = Math.round((r - Math.abs(dy)) / step) * step;
    ctx.fillRect(Math.round((cx - span) / step) * step, Math.round((cy + dy) / step) * step, span * 2 + step, step);
  }
}

function pxRing(ctx, cx, cy, r, thickness, fill, dither = false) {
  ctx.fillStyle = fill;
  const outerR2 = r * r;
  const innerR = Math.max(0, r - thickness);
  const innerR2 = innerR * innerR;
  const step = P;
  for (let y = -r; y <= r; y += step) {
    for (let x = -r; x <= r; x += step) {
      const d2 = x * x + y * y;
      if (d2 <= outerR2 && d2 >= innerR2) {
        if (!dither || ((Math.round((cx + x) / P) + Math.round((cy + y) / P)) % 2 === 0)) {
          ctx.fillRect(Math.round((cx + x) / P) * P, Math.round((cy + y) / P) * P, P, P);
        }
      }
    }
  }
}

function pxCircle(ctx, cx, cy, r, fill, dither = false) {
  ctx.fillStyle = fill;
  const r2 = r * r;
  const step = P;
  for (let y = -r; y <= r; y += step) {
    for (let x = -r; x <= r; x += step) {
      if (x * x + y * y <= r2) {
        if (!dither || ((Math.round((cx + x) / P) + Math.round((cy + y) / P)) % 2 === 0)) {
          ctx.fillRect(Math.round((cx + x) / P) * P, Math.round((cy + y) / P) * P, P, P);
        }
      }
    }
  }
}

/**
 * High-Definition Pixel Art Model Renderer for the Colossal 1000-Year Holy Spear (Sen-nen no Yari).
 * Drawn in local weapon space pointing along +X:
 * - Tip extends forward to +length * 0.65 (~117px)
 * - Pommel extends backward to -length * 0.35 (~-63px)
 * - Crossguard and Angel Wings centered at (0, 0)
 *
 * Adheres strictly to:
 * - Rule 11 (Zero shadowBlur - Pure stepped pixel fills)
 * - Rule 19/20 (Minimalist stylized anime/manga precision)
 */
function _drawColossal1000YearSpearModel(ctx, length = 180, scale = 1.0, glowAlpha = 1.0, now = Date.now()) {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.imageSmoothingEnabled = false;

  const tipX = length * 0.65;    // ~117px
  const pommelX = -length * 0.35; // ~-63px
  const pulse = Math.sin(now * 0.008) * 0.15 + 0.85;

  // ─────────────────────────────────────────────
  // 1. STEPPED PIXEL AURA GLOW UNDERLAY (Rule 11 Zero shadowBlur)
  // ─────────────────────────────────────────────
  if (glowAlpha > 0.05) {
    // Outer Velvet Crimson Stepped Pixel Aura
    const auraAlpha1 = (0.35 * glowAlpha * pulse).toFixed(3);
    pxRect(ctx, pommelX - 10, -8, (tipX - pommelX) + 18, 16, `rgba(163, 29, 36, ${auraAlpha1})`);

    // Mid Solar Gold Stepped Pixel Corona
    const auraAlpha2 = (0.65 * glowAlpha * pulse).toFixed(3);
    pxRect(ctx, pommelX - 6, -5, (tipX - pommelX) + 10, 10, `rgba(245, 158, 11, ${auraAlpha2})`);

    // Inner White-Hot Holy Core Streak
    const auraAlpha3 = (0.90 * glowAlpha).toFixed(3);
    pxRect(ctx, pommelX - 2, -2, (tipX - pommelX) + 4, 4, `rgba(255, 255, 255, ${auraAlpha3})`);
  }

  // ─────────────────────────────────────────────
  // 2. PIXEL ART SHAFT & FLUTED GOLDEN BINDINGS (-63px to 0px)
  // ─────────────────────────────────────────────
  // Dark obsidian outer border (6px height: -3 to +3)
  pxRect(ctx, pommelX, -3, -pommelX, 6, '#0E0F14');

  // Velvet blood-iron bed
  pxRect(ctx, pommelX + 2, -2, -pommelX - 2, 4, '#781D16');

  // Solar gold fluted alloy shaft body
  pxRect(ctx, pommelX + 4, -1, -pommelX - 4, 2, '#F59E0B');

  // Specular white-gold top gleam ridge
  pxRect(ctx, pommelX + 4, -2, -pommelX - 4, 1, '#FEF08A');
  pxRect(ctx, pommelX + 14, -2, -pommelX - 24, 1, '#FFFFFF');

  // Stepped diagonal gold rune wraps along the shaft
  const runeCount = 5;
  const runeStep = (-pommelX - 10) / runeCount;
  for (let r = 0; r < runeCount; r++) {
    const rx = pommelX + 6 + r * runeStep;
    // Stepped pixel grip collars
    pxRect(ctx, rx - 2, -4, 4, 8, '#0E0F14');
    pxRect(ctx, rx - 1, -3, 2, 6, '#FBBF24');
    px(ctx, rx - 1, -3, '#FFFFFF');
    px(ctx, rx, 2, '#D97706');
  }

  // ─────────────────────────────────────────────
  // 3. PIXEL ART STREAMING LIGHT RIBBON TASSELS
  // ─────────────────────────────────────────────
  for (let side = -1; side <= 1; side += 2) {
    const rStart = -14;
    const wave1 = Math.round(Math.sin(now * 0.007 + side * 1.5) * 2) * P;
    const wave2 = Math.round(Math.sin(now * 0.007 + side * 1.5 + 1.2) * 3) * P;
    const ribbonAlpha = (0.85 * glowAlpha).toFixed(3);

    // Stepped pixel ribbon path
    pxRect(ctx, rStart - 6, side * 3, 6, 2, `rgba(245, 158, 11, ${ribbonAlpha})`);
    pxRect(ctx, rStart - 16, side * (5 + wave1), 10, 2, `rgba(245, 158, 11, ${ribbonAlpha})`);
    pxRect(ctx, rStart - 30, side * (8 + wave2), 14, 2, `rgba(245, 158, 11, ${ribbonAlpha})`);
    pxRect(ctx, rStart - 48, side * (6 + wave1), 18, 2, `rgba(254, 240, 138, ${ribbonAlpha})`);
    pxRect(ctx, rStart - 64, side * (9 + wave2), 16, 2, `rgba(255, 255, 255, ${ribbonAlpha})`);

    // Ribbon glint highlights
    px(ctx, rStart - 20, side * (5 + wave1), '#FFFFFF');
    px(ctx, rStart - 40, side * (7 + wave1), '#FFFFFF');
  }

  // ─────────────────────────────────────────────
  // 4. PIXEL ART SWEPT ANGEL WINGS CROSSGUARD (0px, ±28px Span)
  // ─────────────────────────────────────────────
  for (let side = -1; side <= 1; side += 2) {
    ctx.save();
    ctx.scale(1, side);

    // ── Tier 1: Outer Long Wing Feather (x: -18 to 2, y: 0 to 28) ──
    // Obsidian outer border
    pxRect(ctx, -18, 24, 6, 4, '#0E0F14');
    pxRect(ctx, -14, 18, 6, 6, '#0E0F14');
    pxRect(ctx, -10, 12, 6, 6, '#0E0F14');
    pxRect(ctx, -6, 6, 6, 6, '#0E0F14');
    pxRect(ctx, -2, 0, 4, 6, '#0E0F14');

    // Solar Gold Wing Body
    pxRect(ctx, -16, 24, 4, 2, '#F59E0B');
    pxRect(ctx, -12, 18, 4, 6, '#F59E0B');
    pxRect(ctx, -8, 12, 4, 6, '#F59E0B');
    pxRect(ctx, -4, 6, 4, 6, '#F59E0B');

    // Specular Wingtip Cut
    pxRect(ctx, -16, 26, 2, 2, '#FEF08A');
    px(ctx, -16, 26, '#FFFFFF');

    // ── Tier 2: Forward Swept Mid Feather (x: 0 to 12, y: 4 to 20) ──
    pxRect(ctx, 8, 18, 4, 4, '#0E0F14');
    pxRect(ctx, 4, 12, 6, 6, '#0E0F14');
    pxRect(ctx, 0, 6, 6, 6, '#0E0F14');

    pxRect(ctx, 8, 18, 2, 2, '#FEF08A');
    px(ctx, 8, 18, '#FFFFFF');
    pxRect(ctx, 4, 12, 4, 4, '#FBBF24');
    pxRect(ctx, 2, 6, 4, 4, '#F59E0B');

    // ── Tier 3: Inner Filigree Guard Tooth (x: 2 to 6, y: 2 to 8) ──
    pxRect(ctx, 4, 4, 4, 4, '#0E0F14');
    pxRect(ctx, 4, 4, 2, 2, '#FEF08A');

    ctx.restore();
  }

  // Central Stepped Circular Halo Collar (diameter 18px)
  pxCircle(ctx, 0, 0, 9, '#0E0F14');
  pxCircle(ctx, 0, 0, 7, '#F59E0B');
  pxCircle(ctx, 0, 0, 5, '#FEF08A');

  // Central Stepped Ruby Devil Jewel Core
  pxDiamond(ctx, 0, 0, 4, '#DC2626', '#0E0F14');
  px(ctx, -1, -1, '#FFFFFF');
  px(ctx, 1, 1, '#781D16');

  // 4 Corner Gold Rivets around Collar
  px(ctx, -6, -6, '#FEF08A');
  px(ctx, 6, -6, '#FEF08A');
  px(ctx, -6, 6, '#FEF08A');
  px(ctx, 6, 6, '#FEF08A');

  // ─────────────────────────────────────────────
  // 5. COLOSSAL PIXEL ART MULTI-FACETED SPEARHEAD (0px to ~117px)
  // ─────────────────────────────────────────────
  // Stepped pixel lance profile:
  // Base flange: x=0..16, y=±8..±14
  // Main taper:  x=16..116, y=±14..0
  const spearBladeSteps = [
    { x0: 0,   x1: 14,  w: 10, fluteW: 6,  coreW: 2 },
    { x0: 14,  x1: 26,  w: 14, fluteW: 8,  coreW: 3 },
    { x0: 26,  x1: 42,  w: 11, fluteW: 6,  coreW: 3 },
    { x0: 42,  x1: 62,  w: 8,  fluteW: 4,  coreW: 2 },
    { x0: 62,  x1: 84,  w: 5,  fluteW: 3,  coreW: 2 },
    { x0: 84,  x1: 102, w: 3,  fluteW: 2,  coreW: 1 },
    { x0: 102, x1: 114, w: 2,  fluteW: 1,  coreW: 1 },
    { x0: 114, x1: 118, w: 1,  fluteW: 0,  coreW: 1 }
  ];

  for (let s of spearBladeSteps) {
    const segW = s.x1 - s.x0;

    // Layer 1: Dark obsidian outer shell
    pxRect(ctx, s.x0, -s.w, segW, s.w * 2, '#0E0F14');

    // Layer 2: Solar Gold Outer Bevels
    if (s.w > 1) {
      pxRect(ctx, s.x0, -s.w + 1, segW, (s.w - 1) * 2, '#F59E0B');
    }

    // Layer 3: Velvet Crimson Blood-Groove Flute
    if (s.fluteW > 0) {
      pxRect(ctx, s.x0, -s.fluteW, segW, s.fluteW * 2, '#781D16');
      pxRect(ctx, s.x0, -s.fluteW + 1, segW, Math.max(1, (s.fluteW - 1) * 2), '#450A0A');
    }

    // Layer 4: Radiant Amber Mid Ridge
    if (s.coreW > 0) {
      pxRect(ctx, s.x0, -s.coreW, segW, s.coreW * 2, '#FBBF24');
    }

    // Layer 5: White-Hot Specular Holy Plasma Spine
    pxRect(ctx, s.x0, -1, segW, 2, '#FFFFFF');

    // Specular top edge glint cuts
    pxRect(ctx, s.x0 + 2, -s.w + 1, Math.min(6, segW - 2), 1, '#FEF08A');
  }

  // Razor needle point at tip
  pxRect(ctx, 116, -1, 4, 2, '#FFFFFF');
  px(ctx, 118, 0, '#FFFFFF');

  // ─────────────────────────────────────────────
  // 6. PIXEL ART WINGED HALO POMMEL (-63px to -84px)
  // ─────────────────────────────────────────────
  ctx.save();
  ctx.translate(pommelX, 0);

  // Stepped Pixel Halo Ring
  pxCircle(ctx, -8, 0, 9, '#0E0F14');
  pxCircle(ctx, -8, 0, 7, '#F59E0B');
  pxCircle(ctx, -8, 0, 4, '#0E0F14');

  // Center Golden Bead
  pxDiamond(ctx, -8, 0, 2, '#FEF08A');

  // 4 Halo Diamond Studs
  px(ctx, -8, -7, '#FFFFFF');
  px(ctx, -8, 7, '#FFFFFF');
  px(ctx, -15, 0, '#FFFFFF');
  px(ctx, -1, 0, '#FFFFFF');

  // Backward Pointing Stepped Pixel Finial Spike (-16px to -26px)
  pxRect(ctx, -16, -3, 2, 6, '#0E0F14');
  pxRect(ctx, -18, -2, 2, 4, '#0E0F14');
  pxRect(ctx, -22, -1, 4, 2, '#0E0F14');
  pxRect(ctx, -26, 0, 4, 1, '#0E0F14');

  pxRect(ctx, -16, -2, 2, 4, '#F59E0B');
  pxRect(ctx, -20, -1, 4, 2, '#F59E0B');
  pxRect(ctx, -24, 0, 4, 1, '#FFFFFF');

  ctx.restore();
  ctx.restore();
}

/**
 * Main Renderer for Makima's Skill 2 Summoning Phase (Overhead Channel).
 * High-definition Pixel Art Style:
 * 1. 3-Tier Multi-Ring Rotating Stepped Pixel Angel Halos hovering overhead
 * 2. Pixel-Art Light Convergence Streams (Dashed pixel filaments)
 * 3. Materializing Pixel Art Colossal 1000-Year Holy Spear
 * 4. Stepped Pixel Mach Condensation Diamonds and Blinding Pixel Corona
 */
export function drawMakimaAngelSpearSummon(ctx, makima) {
  if (!makima || !makima.isSummoningSpear) return;
  const isSuppressed = Boolean(
    makima.isTargetOfAmbush || 
    (typeof makima.areAttackEffectsSuppressed === 'function' && makima.areAttackEffectsSuppressed())
  );
  if (isSuppressed) return;

  const now = Date.now();
  const maxTimer = makima.spearMaxTimer || 50;
  const currentTimer = makima.spearTimer !== undefined ? makima.spearTimer : 0;
  const chargePct = Math.max(0, Math.min(1.0, 1.0 - (currentTimer / maxTimer)));

  // Target aim angle calculation (locked at cast start, NO live auto-aim tracking)
  const aimAngle = makima.spearLaunchAngle !== undefined ? makima.spearLaunchAngle : (makima.gunAngle !== undefined ? makima.gunAngle : (makima.angle || 0));

  // Hover anchor position directly above Makima
  const hoverX = makima.x;
  const hoverY = makima.y - 75;

  // ─────────────────────────────────────────────
  // 0. CONNECTING STEPPED PIXEL ASCENSION DIVINE LIGHT BEAM
  // ─────────────────────────────────────────────
  // Links Makima's raised palm / upper body straight up to the overhead celestial halo center
  ctx.save();
  ctx.imageSmoothingEnabled = false;

  const beamStartX = snap(makima.x);
  const beamStartY = snap(makima.y - (makima.r || 25) * 0.92);
  const beamEndY = snap(hoverY + 8);
  const beamHeight = Math.max(10, beamStartY - beamEndY);

  const beamPulse = Math.sin(now * 0.01) * 0.15 + 0.85;
  const beamHalfW = Math.max(2, snap(3 + chargePct * 5));

  // Layer 1: Outer Velvet Crimson Aura
  const crimsonW = beamHalfW + 6;
  pxRect(ctx, beamStartX - crimsonW, beamEndY, crimsonW * 2, beamHeight, `rgba(163, 29, 36, ${(chargePct * 0.45 * beamPulse).toFixed(3)})`);

  // Layer 2: Solar Gold Stepped Column
  pxRect(ctx, beamStartX - beamHalfW, beamEndY, beamHalfW * 2, beamHeight, `rgba(245, 158, 11, ${(chargePct * 0.80 * beamPulse).toFixed(3)})`);

  // Layer 3: Radiant Amber Mid Column
  const amberW = Math.max(1, Math.round(beamHalfW * 0.6));
  pxRect(ctx, beamStartX - amberW, beamEndY, amberW * 2, beamHeight, `rgba(254, 240, 138, ${(chargePct * 0.90 * beamPulse).toFixed(3)})`);

  // Layer 4: Pure White-Hot Center Spine
  const spineW = Math.max(1, Math.round(beamHalfW * 0.28));
  pxRect(ctx, beamStartX - spineW, beamEndY, spineW * 2, beamHeight, `rgba(255, 255, 255, ${(chargePct * 0.98 * beamPulse).toFixed(3)})`);

  // Ascending Stepped Pixel Energy Waves traveling upward along the beam
  for (let u = 0; u < 3; u++) {
    const uPhase = ((now * 0.004 + u * 0.33) % 1.0);
    const uY = snap(beamStartY - uPhase * beamHeight);
    const uRadius = snap(beamHalfW + (1.0 - uPhase) * 6);
    const uAlpha = Math.sin(uPhase * Math.PI) * chargePct * 0.85;

    pxDiamond(ctx, beamStartX, uY, uRadius, `rgba(255, 255, 255, ${uAlpha.toFixed(3)})`);
    pxDiamond(ctx, beamStartX, uY, uRadius + 3, `rgba(245, 158, 11, ${(uAlpha * 0.75).toFixed(3)})`);
  }

  // Ascending Stepped Golden-White Particle Sparks along the beam
  const sparkStreams = 6;
  for (let s = 0; s < sparkStreams; s++) {
    const sPhase = ((now * 0.006 + s * 0.166) % 1.0);
    const sY = snap(beamStartY - sPhase * beamHeight);
    const sX = snap(beamStartX + Math.sin(s * 1.8 + now * 0.008) * (beamHalfW + 2));
    const sAlpha = Math.sin(sPhase * Math.PI) * chargePct * 0.95;

    ctx.fillStyle = (s % 2 === 0)
      ? `rgba(255, 255, 255, ${sAlpha.toFixed(3)})`
      : `rgba(254, 240, 138, ${sAlpha.toFixed(3)})`;
    ctx.fillRect(sX, sY, P, P);
  }

  ctx.restore();

  // ─────────────────────────────────────────────
  // 1. OVERHEAD HALOS, CONVERGENCE FILAMENTS & SPEAR
  // ─────────────────────────────────────────────
  ctx.save();
  ctx.translate(snap(hoverX), snap(hoverY));
  ctx.imageSmoothingEnabled = false;

  // ─────────────────────────────────────────────
  // 1. MULTI-TIER ROTATING STEPPED PIXEL ANGEL HALOS
  // ─────────────────────────────────────────────
  const rot1 = (now * 0.002);
  const rot2 = (-now * 0.0035);
  const pulse = Math.sin(now * 0.009) * 0.15 + 0.85;

  // Expanding Pixel Light Wave Octagons Streaming Upward
  for (let w = 0; w < 3; w++) {
    const waveProgress = ((now * 0.002 + w * 0.33) % 1.0);
    const waveRadius = snap(24 + waveProgress * 56);
    const waveAlpha = (1.0 - waveProgress) * 0.50 * chargePct;
    const waveY = snap(-waveProgress * 18);

    pxRing(ctx, 0, waveY, waveRadius, 2, `rgba(245, 158, 11, ${waveAlpha.toFixed(3)})`, true);
  }

  // ── Tier 1: Outer Stepped Pixel Halo (r: 64px) with 8 Stepped Sun Spikes & 16 Tick Marks ──
  ctx.save();
  ctx.rotate(rot1);

  // Stepped Pixel Halo Ring
  pxRing(ctx, 0, 0, 64, 3, `rgba(245, 158, 11, ${(0.75 * chargePct * pulse).toFixed(3)})`);

  // 8 Stepped Pixel Sun Ray Spikes (█▄ 4-pixel stepped rays)
  for (let i = 0; i < 8; i++) {
    const spAngle = (i * Math.PI) / 4;
    const isLong = (i % 2 === 0);
    const spikeLen = isLong ? 16 : 10;
    const sx = Math.cos(spAngle) * 64;
    const sy = Math.sin(spAngle) * 64;
    const color = isLong ? '#FEF08A' : '#F59E0B';

    for (let st = 0; st < spikeLen; st += P) {
      const pxX = sx + Math.cos(spAngle) * st;
      const pxY = sy + Math.sin(spAngle) * st;
      const alpha = (1.0 - (st / spikeLen) * 0.5) * chargePct;
      ctx.fillStyle = isLong ? `rgba(254, 240, 138, ${alpha.toFixed(3)})` : `rgba(245, 158, 11, ${alpha.toFixed(3)})`;
      ctx.fillRect(Math.round(pxX / P) * P, Math.round(pxY / P) * P, P, P);
    }
  }

  // 16 Stepped Square Pixel Tick Marks
  for (let i = 0; i < 16; i++) {
    const tkAngle = (i * Math.PI) / 8;
    const tx = Math.cos(tkAngle) * 60;
    const ty = Math.sin(tkAngle) * 60;
    px(ctx, tx, ty, `rgba(255, 255, 255, ${(0.80 * chargePct).toFixed(3)})`);
  }
  ctx.restore();

  // ── Tier 2: Middle Stepped Pixel Halo (r: 44px) with 8 Orbiting Pixel Diamonds ──
  ctx.save();
  ctx.rotate(rot2);

  pxRing(ctx, 0, 0, 44, 2, `rgba(251, 191, 36, ${(0.85 * chargePct).toFixed(3)})`);
  pxRing(ctx, 0, 0, 40, 2, `rgba(255, 255, 255, ${(0.90 * chargePct).toFixed(3)})`);

  // 8 Orbiting Stepped Pixel Diamonds (◆)
  for (let b = 0; b < 8; b++) {
    const bdAngle = (b * Math.PI) / 4;
    const bx = Math.cos(bdAngle) * 44;
    const by = Math.sin(bdAngle) * 44;

    pxDiamond(ctx, bx, by, 3, '#FFFFFF', '#0E0F14');
    px(ctx, bx, by, '#F59E0B');
  }
  ctx.restore();

  // ── Tier 3: Inner Solar Core Pixel Halo (r: 26px) ──
  pxRing(ctx, 0, 0, 26, 3, `rgba(255, 255, 255, ${(0.95 * chargePct).toFixed(3)})`);
  pxRing(ctx, 0, 0, 22, 2, `rgba(245, 158, 11, ${(0.80 * chargePct).toFixed(3)})`);

  ctx.restore();

  // ─────────────────────────────────────────────
  // 2. PIXEL-ART LIGHT CONVERGENCE FILAMENTS (Dashed Pixel Streams)
  // ─────────────────────────────────────────────
  ctx.save();
  ctx.translate(snap(hoverX), snap(hoverY));
  ctx.imageSmoothingEnabled = false;

  const streamCount = 12;
  for (let st = 0; st < streamCount; st++) {
    const stPhase = ((now * 0.003 + st * 0.083) % 1.0);
    const stAngle = (st * Math.PI * 2) / streamCount + (now * 0.001);
    const outerDist = 130 * (1.0 - stPhase);
    const innerDist = Math.max(12, outerDist - 36);
    const stAlpha = Math.sin(stPhase * Math.PI) * 0.90 * chargePct;

    // Draw stepped dashed pixel filament stream
    const steps = 6;
    for (let s = 0; s < steps; s++) {
      const u = s / steps;
      const curD = outerDist - u * (outerDist - innerDist);
      const pxX = Math.cos(stAngle + u * 0.2) * curD;
      const pxY = Math.sin(stAngle + u * 0.2) * curD;

      if (s % 2 === 0) {
        ctx.fillStyle = `rgba(254, 240, 138, ${stAlpha.toFixed(3)})`;
        ctx.fillRect(Math.round(pxX / P) * P, Math.round(pxY / P) * P, P, P);
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${stAlpha.toFixed(3)})`;
        ctx.fillRect(Math.round(pxX / P) * P, Math.round(pxY / P) * P, P, P);
      }
    }

    // Leading spark head (3x3 pixel block)
    const headX = Math.cos(stAngle + 0.2) * innerDist;
    const headY = Math.sin(stAngle + 0.2) * innerDist;
    ctx.fillStyle = `rgba(255, 255, 255, ${stAlpha.toFixed(3)})`;
    ctx.fillRect(snap(headX - 1), snap(headY - 1), P * 1.5, P * 1.5);
  }
  ctx.restore();

  // ─────────────────────────────────────────────
  // 3. COLOSSAL PIXEL ART 1000-YEAR SPEAR MATERIALIZATION
  // ─────────────────────────────────────────────
  ctx.save();
  ctx.translate(snap(hoverX), snap(hoverY));
  ctx.imageSmoothingEnabled = false;

  // Pixel Micro-vibrations near channel completion (frames 40 to 50)
  if (chargePct >= 0.80) {
    const vibAmt = snap((chargePct - 0.80) * 10.0);
    ctx.translate(
      (Math.random() > 0.5 ? vibAmt : -vibAmt),
      (Math.random() > 0.5 ? vibAmt : -vibAmt)
    );
  }

  // Smooth rotation to aim angle
  ctx.rotate(aimAngle);

  // Materialization scaling
  const spearScale = 0.25 + chargePct * 0.75;
  _drawColossal1000YearSpearModel(ctx, 180, spearScale, chargePct, now);

  // Climax charging stepped pixel Mach diamonds around spearhead
  if (chargePct >= 0.75) {
    const conePct = (chargePct - 0.75) / 0.25;
    const tipX = snap(180 * 0.65 * spearScale);

    ctx.save();
    ctx.translate(tipX, 0);

    // Expanding Stepped Pixel Diamonds
    const coneR = snap(10 + conePct * 22);
    pxDiamond(ctx, 0, 0, coneR, `rgba(255, 255, 255, ${(conePct * 0.90).toFixed(3)})`, '#0E0F14');
    pxDiamond(ctx, -8, 0, Math.round(coneR * 1.3), `rgba(245, 158, 11, ${(conePct * 0.75).toFixed(3)})`);

    // Blinding 8x8 Pixel Star Core at Tip
    pxDiamond(ctx, 0, 0, 6, '#FFFFFF');
    pxRect(ctx, -4, -1, 8, 2, '#FFFFFF');
    pxRect(ctx, -1, -4, 2, 8, '#FFFFFF');

    ctx.restore();
  }

  ctx.restore();
}

/**
 * Main Renderer for Makima's In-Flight 1000-Year Holy Spear Projectile.
 * High-definition Pixel Art Style:
 * 1. Stepped Pixel Plasma Comet Tail (150px length with dithered dissipation)
 * 2. Stepped Pixel Mach Shockwave Diamonds
 * 3. Orbiting Pixel Halos
 * 4. Colossal Pixel Art Spear Model
 */
export function drawMakimaAngelSpearFlight(ctx, spear) {
  if (!spear || spear.isDead || (spear.life !== undefined && spear.life <= 0)) return;

  const now = Date.now();
  const angle = spear.angle || 0;

  ctx.save();
  ctx.translate(snap(spear.x), snap(spear.y));
  ctx.rotate(angle);
  ctx.imageSmoothingEnabled = false;

  // ─────────────────────────────────────────────
  // 1. STEPPED PIXEL PLASMA COMET TAIL (-150px length)
  // ─────────────────────────────────────────────
  const tailLength = 150;
  const tailSegments = 15;
  const segW = tailLength / tailSegments;

  for (let s = 0; s < tailSegments; s++) {
    const u = s / tailSegments;
    const segX = -s * segW;
    const halfH = Math.max(1, Math.round((1.0 - u) * 10)) * P;
    const alpha = (1.0 - u * 0.85);

    // Layer A: Velvet Crimson Outer Warp Envelope (Dithered stepped pixels)
    pxRect(ctx, segX - segW, -halfH - 2, segW, (halfH + 2) * 2, `rgba(163, 29, 36, ${(alpha * 0.40).toFixed(3)})`);

    // Layer B: Solar Gold Holy Plasma Body
    pxRect(ctx, segX - segW, -halfH, segW, halfH * 2, `rgba(245, 158, 11, ${(alpha * 0.75).toFixed(3)})`);

    // Layer C: Bright Gold Core
    const coreH = Math.max(1, Math.round(halfH * 0.5));
    pxRect(ctx, segX - segW, -coreH, segW, coreH * 2, `rgba(254, 240, 138, ${(alpha * 0.85).toFixed(3)})`);

    // Layer D: White-Hot Kinetic Spine
    pxRect(ctx, segX - segW, -1, segW, 2, `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`);

    // Staggered Dissolving Holy Pixel Embers
    if (s > 4) {
      const emberY = ((s * 7) % 11 - 5) * P;
      px(ctx, segX - segW - 4, emberY, '#FEF08A');
    }
  }

  // ─────────────────────────────────────────────
  // 2. STEPPED PIXEL MACH SHOCKWAVE DIAMONDS
  // ─────────────────────────────────────────────
  for (let r = 1; r <= 3; r++) {
    const ringPhase = ((now * 0.015 + r * 0.33) % 1.0);
    const ringX = snap(-r * 38 - ringPhase * 24);
    const ringR = snap(10 + ringPhase * 18);
    const ringAlpha = (1.0 - ringPhase) * 0.80;

    pxDiamond(ctx, ringX, 0, ringR, `rgba(245, 158, 11, ${ringAlpha.toFixed(3)})`);
    pxDiamond(ctx, ringX, 0, Math.round(ringR * 0.6), `rgba(255, 255, 255, ${(ringAlpha * 0.9).toFixed(3)})`);
  }

  // ─────────────────────────────────────────────
  // 3. ORBITING STEPPED PIXEL HALOS ALONG SHAFT
  // ─────────────────────────────────────────────
  const haloOrbX = snap(-25 + Math.sin(now * 0.01) * 20);
  const haloRot = (now * 0.008);

  ctx.save();
  ctx.translate(haloOrbX, 0);
  ctx.rotate(haloRot);

  pxRing(ctx, 0, 0, 18, 2, 'rgba(254, 240, 138, 0.85)');

  for (let d = 0; d < 4; d++) {
    const dAngle = (d * Math.PI) / 2;
    const dx = Math.cos(dAngle) * 18;
    const dy = Math.sin(dAngle) * 18;
    pxDiamond(ctx, dx, dy, 2, '#FFFFFF', '#0E0F14');
  }
  ctx.restore();

  // ─────────────────────────────────────────────
  // 4. COLOSSAL PIXEL ART SPEAR MODEL
  // ─────────────────────────────────────────────
  _drawColossal1000YearSpearModel(ctx, 180, 1.0, 1.0, now);

  ctx.restore();
}

/**
 * Main Renderer for the Radiant Golden Holy Cross Explosion (Impact Detonation).
 * High-definition Pixel Art Style:
 * 1. Colossal Stepped Pixel Holy Cross Pillars (Vertical 360px, Horizontal 300px with dithered plasma edges)
 * 2. 8-Point Stepped Diagonal Starburst Ray Stairs
 * 3. Stepped Concentric Pixel Shockwave Rings (r: 10px -> 160px) with 12 Pixel Diamonds
 * 4. Epicenter Pixel Ground Rune / Scorch Seal
 * 5. Radial Pixel Spark Bursts (2x2, 3x3, 4x4 blocks)
 */
export function drawMakimaHolyCrossExplosion(ctx, expl) {
  if (!expl || expl.life <= 0) return;

  const now = Date.now();
  const maxLife = expl.maxLife || 32;
  const life = expl.life;
  const progress = Math.max(0, Math.min(1.0, 1.0 - (life / maxLife)));
  const alpha = Math.max(0, 1.0 - Math.pow(progress, 1.15));
  const maxR = expl.radius || 160;
  const currentR = snap(maxR * Math.min(1.0, Math.pow(progress, 0.65) * 1.25));

  ctx.save();
  ctx.translate(snap(expl.x), snap(expl.y));
  ctx.imageSmoothingEnabled = false;

  // ─────────────────────────────────────────────
  // 1. EPICENTER PIXEL GROUND RUNE / SCORCH SEAL
  // ─────────────────────────────────────────────
  const scorchR = snap(maxR * 0.65 * (1.0 - progress * 0.3));
  ctx.save();
  ctx.rotate(progress * 0.3);

  // Outer Stepped Diamond Seal
  pxDiamond(ctx, 0, 0, scorchR, `rgba(245, 158, 11, ${(alpha * 0.65).toFixed(3)})`);
  pxDiamond(ctx, 0, 0, Math.round(scorchR * 0.7), `rgba(255, 255, 255, ${(alpha * 0.85).toFixed(3)})`);
  pxDiamond(ctx, 0, 0, Math.round(scorchR * 0.4), `rgba(163, 29, 36, ${(alpha * 0.55).toFixed(3)})`);

  // 4 Stepped Cardinal Rune Blocks
  for (let cr = 0; cr < 4; cr++) {
    const crAngle = (cr * Math.PI) / 2;
    const crX = Math.cos(crAngle) * (scorchR * 0.5);
    const crY = Math.sin(crAngle) * (scorchR * 0.5);
    pxDiamond(ctx, crX, crY, 4, '#FEF08A', '#0E0F14');
  }
  ctx.restore();

  // ─────────────────────────────────────────────
  // 2. COLOSSAL STEPPED PIXEL HOLY CROSS LIGHT PILLARS
  // ─────────────────────────────────────────────
  const vertHalfH = snap(180 * (1.0 - progress * 0.45));
  const vertHalfW = Math.max(2, snap(14 * (1.0 - progress * 0.65)));
  const horizHalfW = snap(150 * (1.0 - progress * 0.45));
  const horizHalfH = Math.max(2, snap(11 * (1.0 - progress * 0.65)));

  // ── A. Vertical Stepped Pixel Light Pillar ──
  // Layer 1: Outer Velvet Crimson Aura (Dithered pixel border)
  pxRect(ctx, -vertHalfW - 4, -vertHalfH - 12, (vertHalfW + 4) * 2, (vertHalfH + 12) * 2, `rgba(163, 29, 36, ${(alpha * 0.45).toFixed(3)})`);
  pxDiamond(ctx, 0, -vertHalfH - 16, vertHalfW + 6, `rgba(163, 29, 36, ${(alpha * 0.45).toFixed(3)})`);
  pxDiamond(ctx, 0, vertHalfH + 16, vertHalfW + 6, `rgba(163, 29, 36, ${(alpha * 0.45).toFixed(3)})`);

  // Layer 2: Solar Gold Stepped Column
  pxRect(ctx, -vertHalfW, -vertHalfH, vertHalfW * 2, vertHalfH * 2, `rgba(245, 158, 11, ${(alpha * 0.80).toFixed(3)})`);
  pxDiamond(ctx, 0, -vertHalfH - 8, vertHalfW + 2, `rgba(245, 158, 11, ${(alpha * 0.80).toFixed(3)})`);
  pxDiamond(ctx, 0, vertHalfH + 8, vertHalfW + 2, `rgba(245, 158, 11, ${(alpha * 0.80).toFixed(3)})`);

  // Layer 3: Radiant Amber Mid Column
  const midVW = Math.max(1, Math.round(vertHalfW * 0.6));
  pxRect(ctx, -midVW, -vertHalfH * 0.9, midVW * 2, vertHalfH * 1.8, `rgba(254, 240, 138, ${(alpha * 0.90).toFixed(3)})`);

  // Layer 4: Pure White-Hot Center Spine
  const coreVW = Math.max(1, Math.round(vertHalfW * 0.3));
  pxRect(ctx, -coreVW, -vertHalfH * 0.85, coreVW * 2, vertHalfH * 1.7, `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(3)})`);

  // ── B. Horizontal Stepped Pixel Light Pillar ──
  // Layer 1: Outer Velvet Crimson Aura
  pxRect(ctx, -horizHalfW - 12, -horizHalfH - 4, (horizHalfW + 12) * 2, (horizHalfH + 4) * 2, `rgba(163, 29, 36, ${(alpha * 0.45).toFixed(3)})`);
  pxDiamond(ctx, -horizHalfW - 16, 0, horizHalfH + 6, `rgba(163, 29, 36, ${(alpha * 0.45).toFixed(3)})`);
  pxDiamond(ctx, horizHalfW + 16, 0, horizHalfH + 6, `rgba(163, 29, 36, ${(alpha * 0.45).toFixed(3)})`);

  // Layer 2: Solar Gold Stepped Column
  pxRect(ctx, -horizHalfW, -horizHalfH, horizHalfW * 2, horizHalfH * 2, `rgba(245, 158, 11, ${(alpha * 0.80).toFixed(3)})`);
  pxDiamond(ctx, -horizHalfW - 8, 0, horizHalfH + 2, `rgba(245, 158, 11, ${(alpha * 0.80).toFixed(3)})`);
  pxDiamond(ctx, horizHalfW + 8, 0, horizHalfH + 2, `rgba(245, 158, 11, ${(alpha * 0.80).toFixed(3)})`);

  // Layer 3: Radiant Amber Mid Column
  const midHW = Math.max(1, Math.round(horizHalfH * 0.6));
  pxRect(ctx, -horizHalfW * 0.9, -midHW, horizHalfW * 1.8, midHW * 2, `rgba(254, 240, 138, ${(alpha * 0.90).toFixed(3)})`);

  // Layer 4: Pure White-Hot Center Spine
  const coreHW = Math.max(1, Math.round(horizHalfH * 0.3));
  pxRect(ctx, -horizHalfW * 0.85, -coreHW, horizHalfW * 1.7, coreHW * 2, `rgba(255, 255, 255, ${(alpha * 0.98).toFixed(3)})`);

  // ─────────────────────────────────────────────
  // 3. 8-POINT STEPPED DIAGONAL STARBURST RAY STAIRS
  // ─────────────────────────────────────────────
  const diagLen = snap(110 * (1.0 - progress * 0.5));
  const diagSteps = Math.round(diagLen / (P * 3));

  for (let d = 0; d < 4; d++) {
    const dAngle = Math.PI / 4 + (d * Math.PI) / 2;
    const signX = Math.round(Math.cos(dAngle));
    const signY = Math.round(Math.sin(dAngle));

    for (let st = 1; st <= diagSteps; st++) {
      const stepDist = st * P * 3;
      const stepAlpha = (1.0 - (st / diagSteps) * 0.6) * alpha;
      const pxX = signX * stepDist;
      const pxY = signY * stepDist;

      // 4x4 Stepped Gold Block
      ctx.fillStyle = `rgba(254, 240, 138, ${stepAlpha.toFixed(3)})`;
      ctx.fillRect(Math.round(pxX / P) * P, Math.round(pxY / P) * P, P * 2, P * 2);

      // White Center Core
      ctx.fillStyle = `rgba(255, 255, 255, ${stepAlpha.toFixed(3)})`;
      ctx.fillRect(Math.round(pxX / P) * P, Math.round(pxY / P) * P, P, P);
    }
  }

  // ─────────────────────────────────────────────
  // 4. EXPANDING CONCENTRIC STEPPED PIXEL SHOCKWAVE RINGS
  // ─────────────────────────────────────────────
  // Outer Stepped Pixel Shockwave Ring (r: 10px -> 160px)
  pxRing(ctx, 0, 0, currentR, 3, `rgba(245, 158, 11, ${(alpha * 0.85).toFixed(3)})`);

  // 12 Stepped Pixel Diamonds along the outer ring
  for (let b = 0; b < 12; b++) {
    const bAngle = (b * Math.PI) / 6;
    const bx = Math.cos(bAngle) * currentR;
    const by = Math.sin(bAngle) * currentR;

    pxDiamond(ctx, bx, by, 3, '#FFFFFF', '#0E0F14');
  }

  // Middle White-Hot Stepped Pixel Ring
  pxRing(ctx, 0, 0, Math.round(currentR * 0.72), 2, `rgba(255, 255, 255, ${(alpha * 0.95).toFixed(3)})`);

  // Inner Crimson Stepped Pixel Ring
  pxRing(ctx, 0, 0, Math.round(currentR * 0.45), 2, `rgba(163, 29, 36, ${(alpha * 0.65).toFixed(3)})`);

  // Epicenter Radiant Diamond Burst
  pxDiamond(ctx, 0, 0, snap(14 * (1.0 - progress * 0.6)), '#FFFFFF');

  // ─────────────────────────────────────────────
  // 5. RADIAL PIXEL SPARKS & DEBRIS BLOCKS
  // ─────────────────────────────────────────────
  const sparkCount = 28;
  for (let sp = 0; sp < sparkCount; sp++) {
    const spAngle = (sp * Math.PI * 2) / sparkCount + (sp * 0.35);
    const spDist = snap(currentR * (0.3 + ((sp * 17) % 70) * 0.01));
    const spX = Math.cos(spAngle) * spDist;
    const spY = Math.sin(spAngle) * spDist;
    const spSize = (sp % 3 === 0) ? P * 2 : P;
    const spAlpha = (1.0 - progress) * 0.95;

    let spColor;
    if (sp % 4 === 0) spColor = `rgba(255, 255, 255, ${spAlpha.toFixed(3)})`;
    else if (sp % 4 === 1) spColor = `rgba(254, 240, 138, ${spAlpha.toFixed(3)})`;
    else if (sp % 4 === 2) spColor = `rgba(245, 158, 11, ${spAlpha.toFixed(3)})`;
    else spColor = `rgba(220, 38, 38, ${spAlpha.toFixed(3)})`;

    ctx.fillStyle = spColor;
    ctx.fillRect(Math.round(spX / P) * P, Math.round(spY / P) * P, spSize, spSize);
  }

  ctx.restore();
}

// ─────────────────────────────────────────────
// CHAIN BREAK SHATTER ANIMATION ENGINE
// ─────────────────────────────────────────────
export const activeChainBreakShards = [];

/**
 * Spawns a dramatic explosive chain break shatter effect when a chained enemy
 * is knocked back beyond break distance.
 */
export function spawnMakimaChainBreakEffect(makima, target) {
  if (!makima || !target) return;
  const angleToTarget = Math.atan2(target.y - makima.y, target.x - makima.x);
  const origin = getMakimaChainOrigin(makima, angleToTarget);
  const startX = origin.x;
  const startY = origin.y;
  const targetX = target.x;
  const targetY = target.y;

  const dx = targetX - startX;
  const dy = targetY - startY;
  const totalDist = Math.hypot(dx, dy);
  if (totalDist < 1) return;

  const chainAngle = Math.atan2(dy, dx);
  const perpX = -Math.sin(chainAngle);
  const perpY = Math.cos(chainAngle);

  // 1. Audio SFX: Sharp metallic chain snap / shatter
  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.makima) ? CONFIG.makima : {};
  const snapSnd = cfg.sounds?.chainBreak || cfg.sounds?.chainsHook || 'Assets/Sound Effects/Skills/hookchain.mp3';
  const snapVol = cfg.soundVolumes?.chainBreak ?? 1.10;
  audioSystem.playSFX(snapSnd, snapVol);

  // 2. Global Screen Shake & Shockwave Sparks
  triggerGlobalScreenShake(9, 14);
  const midX = (startX + targetX) * 0.5;
  const midY = (startY + targetY) * 0.5;
  spawnSparks(midX, midY, 20, '#F59E0B');
  spawnSparks(targetX, targetY, 18, '#A31D24');
  spawnImpactFlash(midX, midY, '#FFFFFF', 30);
  spawnImpactFlash(targetX, targetY, '#F59E0B', 32);

  // Floating text feedback
  spawnFloatingText('CHAIN BROKEN!', midX, midY - 24, '#F59E0B', 18);
  spawnFloatingText('SNAP!', targetX, targetY - 36, '#A31D24', 16);

  // 3. Spawn 28 Interlocking Golden & Iron Chain Link Shards scattered along the broken tether line
  const shardCount = 28;
  for (let i = 0; i < shardCount; i++) {
    const u = (i + Math.random() * 0.5) / shardCount;
    const spawnX = startX + dx * u + (Math.random() - 0.5) * 16;
    const spawnY = startY + dy * u + (Math.random() - 0.5) * 16;

    // High explosive outward scatter perpendicular and radial from the break line
    const scatterSide = (i % 2 === 0 ? 1 : -1) * (3.5 + Math.random() * 8.0);
    const alongVel = (Math.random() - 0.5) * 6.0;
    const vx = perpX * scatterSide + Math.cos(chainAngle) * alongVel;
    const vy = perpY * scatterSide + Math.sin(chainAngle) * alongVel;

    const shardType = (i % 3 === 0) ? 'gold_face' : (i % 3 === 1 ? 'gold_side' : 'iron_collar');
    const life = 24 + Math.floor(Math.random() * 14);

    activeChainBreakShards.push({
      x: spawnX,
      y: spawnY,
      vx,
      vy,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.45,
      type: shardType,
      life,
      maxLife: life,
      scale: 0.8 + Math.random() * 0.5
    });
  }

  // 4. Padlock & Subjugation Collar Burst Shards flying off the enemy
  for (let p = 0; p < 8; p++) {
    const pAngle = (p * Math.PI * 2) / 8 + (Math.random() - 0.5) * 0.5;
    const pSpeed = 6.5 + Math.random() * 7.5;
    const life = 28 + Math.floor(Math.random() * 12);
    activeChainBreakShards.push({
      x: targetX + Math.cos(pAngle) * (target.r || 25) * 0.8,
      y: targetY + Math.sin(pAngle) * (target.r || 25) * 0.8,
      vx: Math.cos(pAngle) * pSpeed,
      vy: Math.sin(pAngle) * pSpeed,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.5,
      type: p % 2 === 0 ? 'padlock' : 'iron_collar',
      life,
      maxLife: life,
      scale: 1.1
    });
  }
}

/**
 * Updates and renders all active chain break shards in real time.
 * Adheres strictly to Rule 11 (Zero shadowBlur).
 */
export function drawMakimaChainBreakEffects(ctx) {
  if (!activeChainBreakShards || activeChainBreakShards.length === 0) return;

  for (let i = activeChainBreakShards.length - 1; i >= 0; i--) {
    const s = activeChainBreakShards[i];
    s.x += s.vx;
    s.y += s.vy;
    s.vx *= 0.92;
    s.vy *= 0.92;
    s.rot += s.rotSpeed;
    s.life--;

    if (s.life <= 0) {
      activeChainBreakShards.splice(i, 1);
      continue;
    }

    const alpha = s.life / s.maxLife;

    ctx.save();
    ctx.translate(snap(s.x), snap(s.y));
    ctx.rotate(s.rot);
    ctx.scale(s.scale, s.scale);
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = false;

    if (s.type === 'gold_face') {
      // Shattered Face-on Link Shard (Stepped pixel oval half)
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(-5, -3, 10, 6);
      ctx.fillStyle = '#781D16';
      ctx.fillRect(-4, -2, 8, 4);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-3, -1.5, 6, 3);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(-3, -1.5, 6, 1);
      ctx.fillStyle = '#180506';
      ctx.fillRect(-1.5, -0.5, 3, 1.5);
    } else if (s.type === 'gold_side') {
      // Shattered Side-on Link Shard
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(-2, -4, 4, 8);
      ctx.fillStyle = '#5A1215';
      ctx.fillRect(-1.5, -3, 3, 6);
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(-1, -2.5, 2, 5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-0.5, -2, 1, 4);
    } else if (s.type === 'padlock') {
      // Shattered Golden Padlock Body
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.fillStyle = '#B45309';
      ctx.fillRect(-3, -3, 6, 6);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-2, -2, 4, 4);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-2, -2, 4, 1.2);
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(-0.5, -0.5, 1.2, 2.0); // Keyhole
    } else {
      // Shattered Dark Iron Subjugation Collar Fragment
      ctx.fillStyle = '#0E0F14';
      ctx.fillRect(-4, -2.5, 8, 5);
      ctx.fillStyle = '#781D16';
      ctx.fillRect(-3, -1.5, 6, 3);
      ctx.fillStyle = '#991B1B';
      ctx.fillRect(-2, -1.0, 4, 2);
      ctx.fillStyle = '#F87171';
      ctx.fillRect(-2, -1.0, 4, 0.8);
    }

    ctx.restore();
  }
}

