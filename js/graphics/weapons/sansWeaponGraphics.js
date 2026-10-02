// ─────────────────────────────────────────────
// Sans Weapon & Attack Visuals (Gaster Blaster, Bones, Blue Soul)
// Adhering to Rule 11 (Zero shadowBlur), Rule 14 (Committed Aim Lock),
// and Rule 15/16 (Clean WebGL/Canvas 2D hybrid effects)
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';

// ── Sprite Cache for Gaster Blaster ──
const _blasterFrames = [];
let _blasterFramesLoaded = false;

function _loadBlasterSprites() {
  if (_blasterFramesLoaded || typeof Image === 'undefined') return;
  _blasterFramesLoaded = true;

  const paths = [
    'Assets/model/Sans/Animations/GasterBlaster/Default/000.png',
    'Assets/model/Sans/Animations/GasterBlaster/Fire/000.png',
    'Assets/model/Sans/Animations/GasterBlaster/Fire/001.png',
    'Assets/model/Sans/Animations/GasterBlaster/Fire/002.png',
    'Assets/model/Sans/Animations/GasterBlaster/Fire/003.png',
    'Assets/model/Sans/Animations/GasterBlaster/Fire/004.png'
  ];

  for (let i = 0; i < paths.length; i++) {
    const img = new Image();
    img.src = paths[i];
    _blasterFrames.push(img);
  }
}

if (typeof window !== 'undefined') {
  _loadBlasterSprites();
}

/**
 * Renders a Gaster Blaster entity in world space.
 * Features: Summoning scale pop, eye socket charge, mouth opening, and firing recoil.
 */
export function drawGasterBlaster(ctx, blaster) {
  if (!blaster) return;
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  ctx.save();
  ctx.translate(blaster.x, blaster.y);
  ctx.rotate(blaster.angle || 0);

  const scale = (blaster.scale || 1.0) * (blaster.spawnScale || 1.0);
  ctx.scale(scale, scale);

  const isFiring = Boolean(blaster.isFiring || blaster.fireTimer > 0);
  const isCharging = Boolean(blaster.isCharging || blaster.chargeTimer > 0);

  // Recoil kickback along local X axis when firing
  if (isFiring) {
    const recoil = Math.sin((blaster.fireProgress || 0.2) * Math.PI) * 12;
    ctx.translate(-recoil, 0);
  }

  // 1. Draw Blaster Skull (Sprite if available, or procedural pixel skeleton skull)
  let drawnSprite = false;
  if (_blasterFrames.length > 0) {
    let frameIdx = 0;
    if (isFiring) {
      // Jaws are wide open for the duration of the laser blast
      const animP = Math.min(1.0, Math.max(0.0, blaster.fireProgress || 0));
      if (animP > 0.90) {
        frameIdx = 4; // Fire/003.png (closing slightly at beam expiration)
      } else {
        frameIdx = 5; // Fire/004.png (wide open blast jaw)
      }
    } else if (isCharging) {
      // Jaws open progressively during charge so mouth is fully open upon beam release
      const chargeP = Math.min(1.0, Math.max(0.0, blaster.chargeProgress || 0));
      if (chargeP < 0.35) {
        frameIdx = 0; // Default/000.png (closed jaw)
      } else if (chargeP < 0.50) {
        frameIdx = 1; // Fire/000.png (initial jaw crack)
      } else if (chargeP < 0.65) {
        frameIdx = 2; // Fire/001.png
      } else if (chargeP < 0.80) {
        frameIdx = 3; // Fire/002.png
      } else if (chargeP < 0.92) {
        frameIdx = 4; // Fire/003.png
      } else {
        frameIdx = 5; // Fire/004.png (fully open jaw ready to fire)
      }
    } else {
      frameIdx = 0;
    }

    const img = _blasterFrames[frameIdx];
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const w = img.naturalWidth * 1.8;
      const h = img.naturalHeight * 1.8;
      ctx.drawImage(img, -w * 0.45, -h * 0.5, w, h);
      ctx.restore();
      drawnSprite = true;
    }
  }

  // Procedural Fallback if sprite not loaded
  if (!drawnSprite) {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 2.5;

    // Skull head dome
    ctx.beginPath();
    ctx.ellipse(0, 0, 24, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Jaw / Snout (opens progressively during charge, fully open when firing)
    const chargeP = blaster.chargeProgress || 0;
    const jawOpenP = isFiring ? 1.0 : (isCharging ? Math.max(0, (chargeP - 0.35) / 0.65) : 0);
    const jawY = 6 + jawOpenP * 6;
    ctx.beginPath();
    ctx.ellipse(14, jawY, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Eye sockets (Glowing Cyan / Yellow during charge or fire)
    ctx.fillStyle = (isFiring || isCharging) ? '#00F5FF' : '#0E0F14';
    ctx.beginPath();
    ctx.arc(2, -5, 4, 0, Math.PI * 2);
    ctx.arc(2, 5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 2. Charging Core Energy Orbs (Rule 11 compliant radial gradients)
  if (isCharging && !isFiring) {
    const chargeP = blaster.chargeProgress || 0.5;
    const orbR = 6 + chargeP * 14;
    const grad = ctx.createRadialGradient(22, 0, 0, 22, 0, orbR);
    grad.addColorStop(0.0, '#FFFFFF');
    grad.addColorStop(0.4, 'rgba(0, 245, 255, 0.85)');
    grad.addColorStop(0.8, 'rgba(37, 99, 235, 0.45)');
    grad.addColorStop(1.0, 'rgba(0, 245, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(22, 0, orbR, 0, Math.PI * 2);
    ctx.fill();

    // Converging charge sparks
    ctx.strokeStyle = '#00F5FF';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI * 0.5) + now * 0.01;
      const dist = orbR + 12 - (chargeP * 8);
      ctx.beginPath();
      ctx.moveTo(22 + Math.cos(a) * dist, Math.sin(a) * dist);
      ctx.lineTo(22 + Math.cos(a) * (dist * 0.4), Math.sin(a) * (dist * 0.4));
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Renders a Gaster Blaster High-Energy Laser Beam.
 * Uses layered concentric beams with white laser core and stepped cyan aura rings (Rule 11 compliant).
 */
export function drawGasterBeam(ctx, beam) {
  if (!beam || beam.length <= 0) return;
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  ctx.save();
  ctx.translate(beam.startX, beam.startY);
  ctx.rotate(beam.angle || 0);

  const length = beam.length || 800;
  const beamWidth = beam.width || 36;
  const alpha = beam.alpha !== undefined ? beam.alpha : 1.0;
  ctx.globalAlpha = alpha;

  const pulse = Math.sin(now * 0.03) * (beamWidth * 0.08);
  const totalW = beamWidth + pulse;

  // 1. Outer Cyan Energy Glow (Layer 1)
  ctx.fillStyle = 'rgba(0, 245, 255, 0.22)';
  ctx.fillRect(0, -totalW * 0.9, length, totalW * 1.8);

  // 2. Mid Electric Blue Laser Column (Layer 2)
  ctx.fillStyle = 'rgba(37, 99, 235, 0.65)';
  ctx.fillRect(0, -totalW * 0.55, length, totalW * 1.1);

  // 3. Cyan Beam Body (Layer 3)
  ctx.fillStyle = '#00F5FF';
  ctx.fillRect(0, -totalW * 0.32, length, totalW * 0.64);

  // 4. Pure White Laser Core Line (Layer 4)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, -totalW * 0.14, length, totalW * 0.28);

  // 6. Impact Blast Spark Burst at the tip
  if (beam.hitEnd) {
    const tipX = beam.hitDistance || length;
    const sparkGrad = ctx.createRadialGradient(tipX, 0, 0, tipX, 0, totalW * 1.8);
    sparkGrad.addColorStop(0.0, '#FFFFFF');
    sparkGrad.addColorStop(0.4, 'rgba(0, 245, 255, 0.85)');
    sparkGrad.addColorStop(1.0, 'rgba(0, 245, 255, 0)');

    ctx.fillStyle = sparkGrad;
    ctx.beginPath();
    ctx.arc(tipX, 0, totalW * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Draws a Bone Projectile (White / Blue / Orange).
 */
export function drawBoneProjectile(ctx, bone) {
  if (!bone) return;
  const h = bone.height || 32;
  const w = bone.width || 10;
  const type = bone.boneType || 'white'; // 'white', 'blue', 'orange'

  ctx.save();
  ctx.translate(bone.x, bone.y);
  ctx.rotate(bone.angle || 0);

  let fillColor = '#FFFFFF';
  let outlineColor = '#0E0F14';
  let capHighlight = '#F8FAFC';

  if (type === 'blue') {
    fillColor = '#00F5FF';
    capHighlight = '#A5F3FC';
  } else if (type === 'orange') {
    fillColor = '#FB923C';
    capHighlight = '#FED7AA';
  }

  // Bone Shaft
  ctx.fillStyle = fillColor;
  ctx.strokeStyle = outlineColor;
  ctx.lineWidth = 1.8;

  ctx.beginPath();
  ctx.rect(-w * 0.35, -h * 0.5, w * 0.7, h);
  ctx.fill();
  ctx.stroke();

  // Top Bone Knuckles
  ctx.beginPath();
  ctx.arc(-w * 0.35, -h * 0.5, w * 0.35, 0, Math.PI * 2);
  ctx.arc(w * 0.35, -h * 0.5, w * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Bottom Bone Knuckles
  ctx.beginPath();
  ctx.arc(-w * 0.35, h * 0.5, w * 0.35, 0, Math.PI * 2);
  ctx.arc(w * 0.35, h * 0.5, w * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Glint
  ctx.fillStyle = capHighlight;
  ctx.fillRect(-w * 0.15, -h * 0.4, w * 0.3, h * 0.8);

  ctx.restore();
}

/**
 * Draws a Ground Bone Stab Warning & Rising Spear Trap.
 */
export function drawBoneStabTrap(ctx, trap) {
  if (!trap) return;
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();

  ctx.save();
  ctx.translate(trap.x, trap.y);

  const isWarning = Boolean(trap.isWarning || trap.warnTimer > 0);
  const isRising = Boolean(trap.isRising || trap.stabTimer > 0);

  if (isWarning) {
    // Red Exclamation Warning Box & Undertale [!] Indicator
    const flash = Math.sin(now * 0.035) > 0;
    const boxW = trap.width || 70;
    const boxH = trap.height || 70;

    // 1. Semi-transparent Red Danger Zone Fill
    ctx.fillStyle = flash ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.18)';
    ctx.fillRect(-boxW * 0.5, -boxH * 0.5, boxW, boxH);

    // 2. High-Contrast Stepped Flashing Red/White Border
    ctx.strokeStyle = flash ? '#FF0000' : '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-boxW * 0.5, -boxH * 0.5, boxW, boxH);

    // 3. Corner Accent Brackets
    const bracketLen = 10;
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3.0;

    // Top-Left
    ctx.beginPath();
    ctx.moveTo(-boxW * 0.5, -boxH * 0.5 + bracketLen);
    ctx.lineTo(-boxW * 0.5, -boxH * 0.5);
    ctx.lineTo(-boxW * 0.5 + bracketLen, -boxH * 0.5);
    ctx.stroke();

    // Top-Right
    ctx.beginPath();
    ctx.moveTo(boxW * 0.5 - bracketLen, -boxH * 0.5);
    ctx.lineTo(boxW * 0.5, -boxH * 0.5);
    ctx.lineTo(boxW * 0.5, -boxH * 0.5 + bracketLen);
    ctx.stroke();

    // Bottom-Left
    ctx.beginPath();
    ctx.moveTo(-boxW * 0.5, boxH * 0.5 - bracketLen);
    ctx.lineTo(-boxW * 0.5, boxH * 0.5);
    ctx.lineTo(-boxW * 0.5 + bracketLen, boxH * 0.5);
    ctx.stroke();

    // Bottom-Right
    ctx.beginPath();
    ctx.moveTo(boxW * 0.5 - bracketLen, boxH * 0.5);
    ctx.lineTo(boxW * 0.5, boxH * 0.5);
    ctx.lineTo(boxW * 0.5, boxH * 0.5 - bracketLen);
    ctx.stroke();

    // 4. Central Flashing Undertale (!) Icon
    ctx.save();
    ctx.fillStyle = flash ? '#FF0000' : '#FFFFFF';
    ctx.font = '900 22px "Press Start 2P", "Silkscreen", monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, 0);
    ctx.restore();
  } else if (isRising) {
    // Rising sharp bone spears
    const ext = trap.extensionProgress || 1.0;
    const spearH = (trap.maxHeight || 60) * ext;

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 2.0;

    const count = Math.max(3, Math.floor(trap.width / 16));
    const step = trap.width / count;

    for (let i = 0; i < count; i++) {
      const bx = -trap.width * 0.5 + i * step + step * 0.5;
      ctx.beginPath();
      ctx.moveTo(bx - step * 0.4, 0);
      ctx.lineTo(bx, -spearH);
      ctx.lineTo(bx + step * 0.4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draws the Blue Soul gravity indicator, transformation flash, gravitational tether,
 * and directional force arrow on a target fighter.
 * (Rule 11 compliant: uses concentric radial gradients and stepped lines, NO shadowBlur).
 */
export function drawBlueSoulIndicator(ctx, target, sansFighter = null) {
  if (!target || (!target.blueSoulActive && (!target.blueSoulTimer || target.blueSoulTimer <= 0))) return;
  const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
  const r = target.r || 25;

  const targetX = target.x;
  const targetY = target.y - (target.z || 0);

  ctx.save();

  // 1. Dynamic Gravitational Lightning Tether from Sans's hand to Victim's Blue Soul
  if (sansFighter && sansFighter.gravitySlamTimer > 0) {
    const sansX = sansFighter.x;
    const sansY = sansFighter.y - (sansFighter.z || 0);

    // Right hand approximate world anchor
    const facingAngle = sansFighter.gunAngle || sansFighter.angle || 0;
    const handWorldX = sansX + Math.cos(facingAngle + 0.35) * (sansFighter.r * 0.85);
    const handWorldY = sansY + Math.sin(facingAngle + 0.35) * (sansFighter.r * 0.85) - sansFighter.r * 0.4;

    const dx = targetX - handWorldX;
    const dy = targetY - handWorldY;
    const dist = Math.hypot(dx, dy);

    if (dist > 10) {
      const segments = Math.max(6, Math.floor(dist / 22));
      const stepX = dx / segments;
      const stepY = dy / segments;
      const perpX = -dy / dist;
      const perpY = dx / dist;

      ctx.save();
      // Outer Cyan Energy Tether Glow
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.45)';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(handWorldX, handWorldY);
      for (let s = 1; s < segments; s++) {
        const wave = Math.sin(now * 0.035 + s * 1.5) * 8.0;
        const sx = handWorldX + stepX * s + perpX * wave;
        const sy = handWorldY + stepY * s + perpY * wave;
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      // Inner White Core Lightning Stream
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(handWorldX, handWorldY);
      for (let s = 1; s < segments; s++) {
        const wave = Math.sin(now * 0.05 + s * 2.2) * 5.0;
        const sx = handWorldX + stepX * s + perpX * wave;
        const sy = handWorldY + stepY * s + perpY * wave;
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 2. Blue Soul Transformation & Heart VFX at Target Center
  ctx.translate(targetX, targetY);

  const slamTimer = target.blueSoulTimer || 0;
  const isTransforming = slamTimer > 60; // Initial grab frames

  // Heart color: Red -> Flash White -> Electric Blue
  let soulColor = '#0055FF';
  let soulOutline = '#00F5FF';
  let glowColor = 'rgba(0, 85, 255, 0.45)';

  if (isTransforming) {
    const flashPhase = Math.floor((80 - slamTimer) / 3) % 3;
    if (flashPhase === 0) {
      soulColor = '#EF4444'; // Undertale Red
      soulOutline = '#F87171';
      glowColor = 'rgba(239, 68, 68, 0.50)';
    } else if (flashPhase === 1) {
      soulColor = '#FFFFFF'; // Flash White
      soulOutline = '#FFFFFF';
      glowColor = 'rgba(255, 255, 255, 0.85)';
    } else {
      soulColor = '#0055FF'; // Snap to Blue
      soulOutline = '#00F5FF';
      glowColor = 'rgba(0, 245, 255, 0.65)';
    }
  }

  // Concentric Radial Energy Halo (Rule 11 compliant)
  const haloR = r * 1.35 + Math.sin(now * 0.02) * 2.5;
  const haloGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, haloR);
  haloGrad.addColorStop(0.0, glowColor);
  haloGrad.addColorStop(0.5, 'rgba(0, 162, 255, 0.20)');
  haloGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(0, 0, haloR, 0, Math.PI * 2);
  ctx.fill();

  // Undertale Pixel Soul Heart Model
  const pulse = Math.sin(now * 0.02) * 1.5;
  const heartScale = (10 + pulse) / 10;

  ctx.save();
  ctx.scale(heartScale, heartScale);

  // Heart Shadow/Outline
  ctx.fillStyle = '#0E0F14';
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.bezierCurveTo(-11, 2, -11, -8, 0, -3.5);
  ctx.bezierCurveTo(11, -8, 11, 2, 0, 7);
  ctx.fill();

  // Heart Body
  ctx.fillStyle = soulColor;
  ctx.beginPath();
  ctx.moveTo(0, 5.5);
  ctx.bezierCurveTo(-9, 1.2, -9, -6.5, 0, -2.5);
  ctx.bezierCurveTo(9, -6.5, 9, 1.2, 0, 5.5);
  ctx.fill();

  // Specular Top-Left Glint
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-3.5, -3.5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // 3. Directional Gravity Arrow (points in direction of slam impulse)
  let dirX = 0;
  let dirY = 1.0;
  if (sansFighter) {
    dirX = sansFighter.gravitySlamDirX || 0;
    dirY = sansFighter.gravitySlamDirY !== undefined ? sansFighter.gravitySlamDirY : 1.0;
  }

  const arrowAngle = Math.atan2(dirY, dirX);
  const arrowDist = r + 16 + Math.sin(now * 0.03) * 3;

  ctx.save();
  ctx.rotate(arrowAngle);
  ctx.translate(arrowDist, 0);

  // Pulsing Chevron Arrows
  ctx.fillStyle = '#00F5FF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.2;

  for (let c = 0; c < 2; c++) {
    const offX = -c * 7;
    ctx.beginPath();
    ctx.moveTo(offX + 6, 0);
    ctx.lineTo(offX - 4, -6);
    ctx.lineTo(offX - 2, 0);
    ctx.lineTo(offX - 4, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Draws an expanding wall slam impact shockwave burst at arena boundaries.
 * (Rule 11 compliant: uses concentric stepped arcs and needle polygons, NO shadowBlur).
 */
export function drawSlamImpact(ctx, impact) {
  if (!impact || impact.timer <= 0) return;
  const progress = 1.0 - (impact.timer / (impact.maxTimer || 20));
  const alpha = Math.max(0, 1.0 - progress);

  ctx.save();
  ctx.translate(impact.x, impact.y);
  ctx.rotate(impact.normalAngle || 0);

  const radius = (impact.radius || 8) + progress * ((impact.maxRadius || 75) - (impact.radius || 8));

  // 1. Concentric Expanding Shockwave Arcs (Rule 11 compliant)
  ctx.strokeStyle = `rgba(0, 245, 255, ${alpha * 0.85})`;
  ctx.lineWidth = Math.max(1.2, 4.0 * (1.0 - progress));
  ctx.beginPath();
  ctx.arc(0, 0, radius, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();

  // Secondary Inner White Flash Arc
  ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.95})`;
  ctx.lineWidth = Math.max(1.0, 2.5 * (1.0 - progress));
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.65, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();

  // 2. Radial Wall Crack Needle Lines
  ctx.fillStyle = `rgba(0, 245, 255, ${alpha * 0.75})`;
  const crackCount = 5;
  for (let i = 0; i < crackCount; i++) {
    const crackAngle = -Math.PI * 0.4 + (i / (crackCount - 1)) * Math.PI * 0.8;
    const crackLen = radius * (0.5 + (i % 2) * 0.4);
    const cosC = Math.cos(crackAngle);
    const sinC = Math.sin(crackAngle);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cosC * crackLen, sinC * crackLen);
    ctx.lineTo(cosC * (crackLen * 0.7) + 2, sinC * (crackLen * 0.7));
    ctx.closePath();
    ctx.fill();
  }

  // 3. Electric Cyan Spark Particles
  ctx.fillStyle = '#FFFFFF';
  for (let k = 0; k < 4; k++) {
    const sparkDist = radius * (0.3 + progress * 0.6);
    const sparkAngle = -Math.PI * 0.35 + (k * 0.25);
    const sx = Math.cos(sparkAngle) * sparkDist;
    const sy = Math.sin(sparkAngle) * sparkDist;
    ctx.fillRect(sx - 1.5, sy - 1.5, 3, 3);
  }

  ctx.restore();
}

/**
 * Draws Sans's iconic Undertale white speech bubble with pixel Comic Sans typography.
 * Rendered on Canvas 2D with a pointer tail and typewriter text reveal.
 */
export function drawSansSpeechBubble(ctx, fighter) {
  if (!fighter || !fighter.speechBubble || fighter.speechBubble.timer <= 0) return;
  const bubble = fighter.speechBubble;
  const text = bubble.text || bubble.fullText;
  if (!text) return;

  ctx.save();

  // Smooth fade-out during final frames
  let alpha = 1.0;
  if (bubble.timer < 18) {
    alpha = Math.max(0, bubble.timer / 18);
  }
  ctx.globalAlpha = alpha;

  const font = '700 13px "Comic Sans MS", "Comic Neue", "Chalkboard SE", monospace, sans-serif';
  ctx.font = font;
  const textW = ctx.measureText(text).width;
  const padX = 12;
  const padY = 5;
  const bubbleW = Math.max(56, textW + padX * 2);
  const bubbleH = 24;

  const bubbleX = fighter.x;
  const bubbleY = fighter.y - (fighter.z || 0) - fighter.r - 26;

  const left = bubbleX - bubbleW / 2;
  const top = bubbleY - bubbleH / 2;
  const r = 5;

  // Draw Speech Bubble Body (White fill with 2px Black Border)
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.0;

  ctx.beginPath();
  ctx.moveTo(left + r, top);
  ctx.lineTo(left + bubbleW - r, top);
  ctx.arcTo(left + bubbleW, top, left + bubbleW, top + r, r);
  ctx.lineTo(left + bubbleW, top + bubbleH - r);
  ctx.arcTo(left + bubbleW, top + bubbleH, left + bubbleW - r, top + bubbleH, r);

  // Downward pointer tail pointing down towards Sans's head
  ctx.lineTo(bubbleX + 4, top + bubbleH);
  ctx.lineTo(bubbleX, top + bubbleH + 7);
  ctx.lineTo(bubbleX - 4, top + bubbleH);

  ctx.lineTo(left + r, top + bubbleH);
  ctx.arcTo(left, top + bubbleH, left, top + bubbleH - r, r);
  ctx.lineTo(left, top + r);
  ctx.arcTo(left, top, left + r, top, r);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  // Render strictly lowercase dialogue in crisp Undertale black
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bubbleX, bubbleY);

  ctx.restore();
}

/**
 * Draws the Undertale Red SOUL Heart Split and Shatter Defeat VFX.
 * Phase 1 (timer 85-71): Floating red soul heart with pulse glow.
 * Phase 2 (timer 70-53): Heart cracked in half and drifting apart with HeartSplit.ogg.
 * Phase 3 (timer 52-0): Exploding pixel shards flying with physics, gravity and rotation.
 */
export function drawHeartShatterEffect(ctx, fx) {
  if (!fx || fx.timer <= 0) return;

  ctx.save();
  ctx.translate(fx.x, fx.y);

  const t = fx.timer;

  // Phase 1: Heart Levitation & Pulsing Glow (timer 85 to 71)
  if (t > 70) {
    const floatY = -Math.sin(((85 - t) / 15) * Math.PI * 0.5) * 16;
    ctx.translate(0, floatY);

    // Subtle concentric aura glow (Rule 11 compliant)
    const pulse = 1.0 + Math.sin((85 - t) * 0.4) * 0.15;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, 18 * pulse, 0, Math.PI * 2);
    ctx.fill();

    _drawUndertaleHeartShape(ctx, 0, 0, 1.2 * pulse);
  }
  // Phase 2: Heart Split into Two Halves (timer 70 to 53)
  else if (t > 52) {
    ctx.translate(0, -16);
    const splitGap = fx.splitGap || (70 - t) * 0.45;

    // Draw Left Half
    ctx.save();
    ctx.translate(-splitGap, 0);
    _drawUndertaleHeartHalf(ctx, -1, 1.2);
    ctx.restore();

    // Draw Right Half
    ctx.save();
    ctx.translate(splitGap, 0);
    _drawUndertaleHeartHalf(ctx, 1, 1.2);
    ctx.restore();

    // Central white crack spark
    if (t > 66) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(-1.5, -8, 3, 16);
    }
  }
  // Phase 3: Pixel Heart Shards Explosion (timer 52 to 0)
  else {
    ctx.translate(0, -16);
    const alpha = Math.min(1.0, t / 18);
    ctx.globalAlpha = Math.max(0, alpha);

    if (fx.shards && fx.shards.length > 0) {
      for (const shard of fx.shards) {
        ctx.save();
        ctx.translate(shard.x, shard.y);
        ctx.rotate(shard.rot || 0);

        const sz = shard.size || 4;
        ctx.fillStyle = shard.color || '#FF0000';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.2;

        // Triangular jagged pixel shard
        ctx.beginPath();
        ctx.moveTo(-sz, sz * 0.6);
        ctx.lineTo(0, -sz);
        ctx.lineTo(sz, sz * 0.4);
        ctx.lineTo(sz * 0.2, sz);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Pixel glint
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-1, -1, 2, 2);

        ctx.restore();
      }
    }
  }

  ctx.restore();
}

/**
 * Helper to render an authentic Undertale Red SOUL Heart shape on Canvas 2D.
 */
function _drawUndertaleHeartShape(ctx, cx, cy, scale = 1.0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#FF0000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.0;

  // Authentic Undertale Heart Geometry (width: 18px, height: 18px)
  ctx.beginPath();
  ctx.moveTo(0, -2);
  // Left top lobe
  ctx.bezierCurveTo(-3, -9, -9, -9, -9, -3);
  ctx.bezierCurveTo(-9, 2, -4, 7, 0, 10);
  // Right top lobe
  ctx.bezierCurveTo(4, 7, 9, 2, 9, -3);
  ctx.bezierCurveTo(9, -9, 3, -9, 0, -2);
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  // Subtle interior glint
  ctx.fillStyle = '#FF6B6B';
  ctx.beginPath();
  ctx.arc(-4, -4, 2.0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Helper to render a split half of the Undertale SOUL Heart with jagged zigzag crack.
 */
function _drawUndertaleHeartHalf(ctx, side = -1, scale = 1.0) {
  ctx.save();
  ctx.scale(scale, scale);

  ctx.fillStyle = '#FF0000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.0;

  ctx.beginPath();
  if (side === -1) {
    // Left Half
    ctx.moveTo(0, -2);
    ctx.bezierCurveTo(-3, -9, -9, -9, -9, -3);
    ctx.bezierCurveTo(-9, 2, -4, 7, 0, 10);
    // Jagged crack back to top
    ctx.lineTo(-2, 6);
    ctx.lineTo(1, 2);
    ctx.lineTo(-2, -1);
    ctx.lineTo(0, -2);
  } else {
    // Right Half
    ctx.moveTo(0, -2);
    ctx.lineTo(2, -1);
    ctx.lineTo(-1, 2);
    ctx.lineTo(2, 6);
    ctx.lineTo(0, 10);
    ctx.bezierCurveTo(4, 7, 9, 2, 9, -3);
    ctx.bezierCurveTo(9, -9, 3, -9, 0, -2);
  }
  ctx.closePath();

  ctx.fill();
  ctx.stroke();

  ctx.restore();
}


