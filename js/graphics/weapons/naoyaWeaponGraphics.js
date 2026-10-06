// ─────────────────────────────────────────────
// Naoya Zenin — Weapon & Projection Sorcery Visuals
// Adhering strictly to Repository Standards:
// - Rule 11: Zero shadowBlur / shadowColor
// - Rule 15: Double-tapered crescent blade slashes
// - Rule 16: Manga 4-point needle speed lines
// ─────────────────────────────────────────────

import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnImpactFlash, spawnSparks } from '../particles/sparkEffect.js';
import { getNaoyaCachedCanvas, drawNaoyaGhostModel } from '../fighters/naoyaSkin.js';

export const NAOYA_WEAPON_GRAPHICS = {
  tanto: {
    bladeBase: '#E2E8F0',
    bladeEdge: '#FFFFFF',
    bladeSpine: '#94A3B8',
    bladeShadow: '#475569',
    guardGold: '#EAB308',
    guardDark: '#713F12',
    handleBase: '#1E293B',
    handleWrap: '#C8E64A',
    pommelGold: '#FACC15',
    outlineDark: '#0E1117'
  },
  vfx: {
    limeCore: '#76E042',
    limeGlow: 'rgba(118, 224, 66, 0.45)',
    shutterCyan: '#00F2FE',
    cyanGlow: 'rgba(0, 242, 254, 0.45)',
    filmInk: '#12141A',
    whiteCore: '#FFFFFF'
  }
};

/**
 * Draws Naoya's concealed Cursed Tanto in front hand.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} gunAngle
 * @param {number} r
 * @param {boolean} swingActive
 * @param {number} swingTimer
 * @param {number} swingProgress
 * @param {Object} opts
 */
export function drawNaoyaTanto(ctx, x, y, gunAngle, r, swingActive = false, swingTimer = 0, swingProgress = 0, opts = {}) {
  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.naoya)
    ? state.weaponCustomizations.naoya
    : { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };

  const scale = custom.scale || 1.0;
  const offX = custom.offsetX || 0;
  const offY = custom.offsetY || 0;
  const angleOff = ((custom.angleOffset || 0) + (opts.angleOffset || 0)) * (Math.PI / 180);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(gunAngle + angleOff);
  ctx.translate(offX, offY);

  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  // Anchor at canonical right hand flank (+r * 0.82, +r * 0.38) or custom hand anchor
  const hx = (opts.handX !== undefined) ? opts.handX : r * 0.82;
  const hy = (opts.handY !== undefined) ? opts.handY : r * 0.38;
  ctx.translate(hx, hy);

  // Dynamic swing / stab rotation
  if (swingActive) {
    if (opts.isStab) {
      const stabRot = (opts.stabRotation !== undefined) ? opts.stabRotation : 0;
      ctx.rotate(stabRot);
    } else {
      const swingSwingRot = Math.sin(swingProgress * Math.PI) * 0.65;
      ctx.rotate(swingSwingRot);
    }
  }

  ctx.scale(scale, scale);

  const colors = NAOYA_WEAPON_GRAPHICS.tanto;

  // 1. Tanto Handle / Tsuka (extends backwards from hand)
  ctx.fillStyle = colors.handleBase;
  ctx.fillRect(-12, -2.5, 12, 5);

  // Diamond wrap styling (Menuki & Ito)
  ctx.fillStyle = colors.handleWrap;
  ctx.beginPath();
  ctx.moveTo(-10, 0); ctx.lineTo(-8, -2); ctx.lineTo(-6, 0); ctx.lineTo(-8, 2); ctx.closePath();
  ctx.moveTo(-6, 0); ctx.lineTo(-4, -2); ctx.lineTo(-2, 0); ctx.lineTo(-4, 2); ctx.closePath();
  ctx.fill();

  // Pommel / Kashira
  ctx.fillStyle = colors.pommelGold;
  ctx.fillRect(-14, -3, 2, 6);

  // 2. Tsuba Guard
  ctx.fillStyle = colors.guardGold;
  ctx.fillRect(0, -5, 2.5, 10);
  ctx.fillStyle = colors.guardDark;
  ctx.fillRect(0.5, -4, 1.5, 8);

  // 3. Tanto Blade (extends forward along +X)
  const bladeLen = 22;
  ctx.beginPath();
  ctx.moveTo(2.5, -2.5);          // Spine start
  ctx.lineTo(2.5 + bladeLen - 5, -2.5); // Spine run
  ctx.lineTo(2.5 + bladeLen, 0);       // Kissaki tip
  ctx.lineTo(2.5 + bladeLen - 3, 2.5); // Cutting edge curve
  ctx.lineTo(2.5, 2.5);                // Edge base
  ctx.closePath();

  // Blade fill
  ctx.fillStyle = colors.bladeBase;
  ctx.fill();

  // Spine dark bevel
  ctx.fillStyle = colors.bladeSpine;
  ctx.beginPath();
  ctx.moveTo(2.5, -2.5);
  ctx.lineTo(2.5 + bladeLen - 5, -2.5);
  ctx.lineTo(2.5 + bladeLen, 0);
  ctx.lineTo(2.5, 0);
  ctx.closePath();
  ctx.fill();

  // Pure white hamon cutting edge
  ctx.strokeStyle = colors.bladeEdge;
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(2.5, 2.5);
  ctx.lineTo(2.5 + bladeLen - 3, 2.5);
  ctx.lineTo(2.5 + bladeLen, 0);
  ctx.stroke();

  // Manga ink outer contour
  ctx.strokeStyle = colors.outlineDark;
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-14, -3, 16, 6);

  ctx.restore();
}

/**
 * Draws Naoya's Double-Tapered Crescent Slash Blade Arc (Rule 15 Compliant).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} fighter
 */
export function drawNaoyaSlashArc(ctx, fighter) {
  if (!fighter || !fighter.slashSwingTimer || fighter.slashSwingTimer <= 0) return;

  const maxTimer = fighter.slashSwingMaxTimer || 18;
  const t = 1 - Math.max(0, Math.min(1, fighter.slashSwingTimer / maxTimer));
  const r = fighter.r || 25;
  const baseAngle = fighter.gunAngle || 0;

  const swingArcSpan = (135 * Math.PI) / 180;
  const startAngle = baseAngle - swingArcSpan / 2;
  const totalAngle = swingArcSpan;

  const activeFrac = 0.65;
  let tipAngle, tailAngle;

  if (t < activeFrac) {
    const p = t / activeFrac;
    tipAngle = startAngle + totalAngle * Math.min(1, p * 1.05);
    tailAngle = startAngle;
  } else {
    const recP = (t - activeFrac) / (1 - activeFrac);
    tipAngle = startAngle + totalAngle;
    tailAngle = startAngle + totalAngle * Math.pow(recP, 1.4);
  }

  if (tipAngle <= tailAngle) return;

  const slashRadius = r + 45;
  const maxThick = 18.0;
  const segments = 24;
  const angleStep = (tipAngle - tailAngle) / segments;

  ctx.save();
  ctx.translate(fighter.x, fighter.y - (fighter.z || 0));

  // 1. Outer Electric Lime Radiant Glow
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const a = tailAngle + i * angleStep;
    const norm = (a - startAngle) / totalAngle;
    const taper = Math.pow(Math.sin(Math.max(0, Math.min(1, norm)) * Math.PI), 1.15) * (0.3 + 0.7 * norm);
    const thick = maxThick * taper * 1.5;
    const curR = slashRadius + thick * 0.5;
    const px = Math.cos(a) * curR;
    const py = Math.sin(a) * curR;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = segments; i >= 0; i--) {
    const a = tailAngle + i * angleStep;
    const norm = (a - startAngle) / totalAngle;
    const taper = Math.pow(Math.sin(Math.max(0, Math.min(1, norm)) * Math.PI), 1.15) * (0.3 + 0.7 * norm);
    const thick = maxThick * taper * 1.5;
    const curR = slashRadius - thick * 0.5;
    ctx.lineTo(Math.cos(a) * curR, Math.sin(a) * curR);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(118, 224, 66, 0.30)';
  ctx.fill();

  // 2. Core Solid Shutter Cyan & Lime Blade Crescent
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const a = tailAngle + i * angleStep;
    const norm = (a - startAngle) / totalAngle;
    const taper = Math.pow(Math.sin(Math.max(0, Math.min(1, norm)) * Math.PI), 1.15) * (0.3 + 0.7 * norm);
    const thick = maxThick * taper;
    const curR = slashRadius + thick * 0.4;
    const px = Math.cos(a) * curR;
    const py = Math.sin(a) * curR;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = segments; i >= 0; i--) {
    const a = tailAngle + i * angleStep;
    const norm = (a - startAngle) / totalAngle;
    const taper = Math.pow(Math.sin(Math.max(0, Math.min(1, norm)) * Math.PI), 1.15) * (0.3 + 0.7 * norm);
    const thick = maxThick * taper;
    const curR = slashRadius - thick * 0.4;
    ctx.lineTo(Math.cos(a) * curR, Math.sin(a) * curR);
  }
  ctx.closePath();
  ctx.fillStyle = '#76E042';
  ctx.fill();

  // 3. Searing Pure White Razor Cutting Edge
  ctx.beginPath();
  for (let i = 0; i <= segments; i++) {
    const a = tailAngle + i * angleStep;
    const px = Math.cos(a) * slashRadius;
    const py = Math.sin(a) * slashRadius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  ctx.restore();
}

// ─────────────────────────────────────────────
// 24 FPS SHUTTER GLASS STASIS & BREAK SYSTEM
// ─────────────────────────────────────────────

let _shutterGlassBreaks = [];

/**
 * Clears all active shutter glass break effects (useful on round restart / death).
 */
export function clearShutterGlassBreaks() {
  _shutterGlassBreaks.length = 0;
}

/**
 * Draws the 24 FPS Film Frame Pane Stasis Overlay over an afflicted target (Rule 11 Zero shadowBlur).
 * Includes pre-break structural cracks and micro-tremor when expiration is imminent.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} target
 * @param {number} remainingFrames
 */
export function draw24FPSFrameStasisOverlay(ctx, target, remainingFrames = 60) {
  if (!target || target.isDead || (target.hp || 0) <= 0) return;
  if (typeof state !== 'undefined' && state.frameCount !== undefined) {
    if (target._frameStasisRenderedFrame === state.frameCount) return;
    target._frameStasisRenderedFrame = state.frameCount;
  }

  const r = target.r || 25;
  const boxW = r * 2.8;
  const boxH = r * 2.8;
  let cx = target.x;
  let cy = target.y - (target.z || 0);

  // Micro-tremor shudder when breaking is imminent (last 14 frames)
  if (remainingFrames <= 14) {
    const tremorAmp = ((15 - remainingFrames) / 14) * 2.0;
    cx += (Math.random() - 0.5) * tremorAmp;
    cy += (Math.random() - 0.5) * tremorAmp;
  }

  ctx.save();
  ctx.translate(cx, cy);

  // Subtle oscillation flicker (accelerates as timer ticks down)
  const freq = remainingFrames <= 14 ? 0.85 : 0.35;
  const pulse = Math.sin(remainingFrames * freq) * 0.15 + 0.85;

  // 1. Semi-transparent Glass Film Pane
  ctx.fillStyle = `rgba(0, 242, 254, ${0.20 * pulse})`;
  ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);

  // Outer Shutter Border
  ctx.strokeStyle = '#00F2FE';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

  // Inner Lime Accent Border
  ctx.strokeStyle = '#76E042';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-boxW / 2 + 3, -boxH / 2 + 3, boxW - 6, boxH - 6);

  // 2. 35mm Film Reel Perforations (Sprocket Holes on Left and Right)
  const holeSize = 3.5;
  const numHoles = 5;
  const gap = (boxH - 8) / numHoles;
  ctx.fillStyle = '#12141A';

  for (let i = 0; i < numHoles; i++) {
    const hy = -boxH / 2 + 4 + i * gap + gap / 2 - holeSize / 2;
    // Left sprocket holes
    ctx.fillRect(-boxW / 2 + 1, hy, holeSize, holeSize);
    // Right sprocket holes
    ctx.fillRect(boxW / 2 - holeSize - 1, hy, holeSize, holeSize);
  }

  // 3. Pre-Break Structural Cracks (when remainingFrames <= 14)
  if (remainingFrames <= 14) {
    const crackProgress = (15 - remainingFrames) / 14;
    _drawFrameCrackFissures(ctx, boxW, boxH, crackProgress);
  }

  // 4. 24 FPS Tag / Countdown
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 9px "Outfit", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1/24s', 0, -boxH / 2 - 8);

  ctx.fillStyle = remainingFrames <= 14 ? '#FF4444' : '#00F2FE';
  ctx.font = '800 8px monospace';
  ctx.fillText(remainingFrames <= 14 ? 'SHATTERING...' : '24 FPS STASIS', 0, boxH / 2 + 8);

  ctx.restore();
}

/**
 * Renders spiderweb stress cracks across the 24 FPS shutter glass frame prior to breaking.
 * Strictly Rule 11 zero shadowBlur compliant.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} boxW
 * @param {number} boxH
 * @param {number} progress (0.0 to 1.0)
 */
function _drawFrameCrackFissures(ctx, boxW, boxH, progress) {
  if (progress <= 0) return;
  const p = Math.min(1.0, Math.max(0.0, progress));

  ctx.save();

  // Branch definitions (from central fracture to perimeter edges)
  const branches = [
    [ [0, 0], [-boxW * 0.15, -boxH * 0.12], [-boxW * 0.28, -boxH * 0.32], [-boxW * 0.46, -boxH * 0.44] ],
    [ [0, 0], [boxW * 0.12, -boxH * 0.16], [boxW * 0.30, -boxH * 0.25], [boxW * 0.44, -boxH * 0.42] ],
    [ [0, 0], [-boxW * 0.14, boxH * 0.15], [-boxW * 0.32, boxH * 0.28], [-boxW * 0.45, boxH * 0.43] ],
    [ [0, 0], [boxW * 0.18, boxH * 0.14], [boxW * 0.34, boxH * 0.30], [boxW * 0.47, boxH * 0.45] ],
    [ [-boxW * 0.15, -boxH * 0.12], [-boxW * 0.35, -boxH * 0.08], [-boxW * 0.48, -boxH * 0.04] ],
    [ [boxW * 0.18, boxH * 0.14], [boxW * 0.36, boxH * 0.06], [boxW * 0.48, boxH * 0.02] ],
    [ [-boxW * 0.15, -boxH * 0.12], [boxW * 0.12, -boxH * 0.16], [boxW * 0.18, boxH * 0.14], [-boxW * 0.14, boxH * 0.15] ]
  ];

  // 1. Cyan under-layer glow line (Rule 11 zero shadowBlur, slightly wider stroke)
  ctx.strokeStyle = `rgba(0, 242, 254, ${0.55 + p * 0.40})`;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'miter';

  for (let b = 0; b < branches.length; b++) {
    const pts = branches[b];
    const maxIdx = Math.min(pts.length, Math.ceil(pts.length * Math.min(1.0, p * 1.25)));
    if (maxIdx < 2) continue;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < maxIdx; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    if (b === 6 && p > 0.6) ctx.closePath();
    ctx.stroke();
  }

  // 2. Pure White razor sharp core crack line
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 + p * 0.15})`;
  ctx.lineWidth = 1.1;

  for (let b = 0; b < branches.length; b++) {
    const pts = branches[b];
    const maxIdx = Math.min(pts.length, Math.ceil(pts.length * Math.min(1.0, p * 1.25)));
    if (maxIdx < 2) continue;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < maxIdx; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    if (b === 6 && p > 0.6) ctx.closePath();
    ctx.stroke();
  }

  // 3. Central fracture glint star
  if (p > 0.3) {
    const glintSize = 2.0 + p * 3.5;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-glintSize / 2, -1, glintSize, 2);
    ctx.fillRect(-1, -glintSize / 2, 2, glintSize);
  }

  ctx.restore();
}

/**
 * Triggers the 24 FPS Shutter Glass Break animation and plays Naoya's glass break sound effect.
 * @param {Object} target - Target entity or object with x, y, r
 * @param {Object} [opts={}] - Optional coordinate / radius overrides
 */
export function triggerShutterGlassBreak(target, opts = {}) {
  if (!target) return;
  const cx = opts.x !== undefined ? opts.x : (target.x || 0);
  const cy = opts.y !== undefined ? opts.y : ((target.y || 0) - (target.z || 0));
  const r = opts.r !== undefined ? opts.r : (target.r || 25);
  const boxW = r * 2.8;
  const boxH = r * 2.8;

  // 1. Play authentic Naoya glass break SFX
  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.naoya) ? CONFIG.naoya : {};
  const vol = cfg.soundVolumes?.glassBreak !== undefined ? cfg.soundVolumes.glassBreak : 1.0;
  if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX('naoya_glass_break', vol);
  }

  // 2. Global screen shake & impact flashes
  triggerGlobalScreenShake(4, 6);
  try {
    spawnImpactFlash(cx, cy, boxW * 0.95, 'cyan');
    spawnSparks(cx, cy, 16, 'cyan', '#00F2FE');
    spawnSparks(cx, cy, 10, 'lime', '#76E042');
    spawnFloatingText(cx, cy - boxH / 2 - 14, '24 FPS SHATTER!', '#00F2FE');
  } catch (e) {}

  // 3. Prevent unbounded memory growth: keep max 6 concurrent glass break effects
  if (_shutterGlassBreaks.length >= 6) {
    _shutterGlassBreaks.shift();
  }

  // 4. Construct the shattered 4 corner frame chunks (35mm film borders)
  const cornerFragments = [
    {
      x: cx - boxW * 0.25,
      y: cy - boxH * 0.25,
      vx: -(6.0 + Math.random() * 3.0),
      vy: -(5.0 + Math.random() * 3.5),
      w: boxW * 0.44,
      h: boxH * 0.44,
      rot: 0,
      rotSpeed: -(0.06 + Math.random() * 0.08),
      cornerType: 'TL'
    },
    {
      x: cx + boxW * 0.25,
      y: cy - boxH * 0.25,
      vx: (6.0 + Math.random() * 3.0),
      vy: -(5.0 + Math.random() * 3.5),
      w: boxW * 0.44,
      h: boxH * 0.44,
      rot: 0,
      rotSpeed: (0.06 + Math.random() * 0.08),
      cornerType: 'TR'
    },
    {
      x: cx - boxW * 0.25,
      y: cy + boxH * 0.25,
      vx: -(6.0 + Math.random() * 3.0),
      vy: (4.0 + Math.random() * 3.5),
      w: boxW * 0.44,
      h: boxH * 0.44,
      rot: 0,
      rotSpeed: (0.06 + Math.random() * 0.08),
      cornerType: 'BL'
    },
    {
      x: cx + boxW * 0.25,
      y: cy + boxH * 0.25,
      vx: (6.0 + Math.random() * 3.0),
      vy: (4.0 + Math.random() * 3.5),
      w: boxW * 0.44,
      h: boxH * 0.44,
      rot: 0,
      rotSpeed: -(0.06 + Math.random() * 0.08),
      cornerType: 'BR'
    }
  ];

  // 5. Construct 16 sharp polygonal glass crystal shards
  const shardCount = 16;
  const glassShards = [];
  const palette = [
    'rgba(0, 242, 254, 0.85)',
    'rgba(224, 255, 255, 0.90)',
    'rgba(255, 255, 255, 0.95)',
    'rgba(118, 224, 66, 0.80)'
  ];

  for (let i = 0; i < shardCount; i++) {
    const angle = (i / shardCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
    const speed = 5.5 + Math.random() * 7.5;
    const size = (boxW * 0.12) + Math.random() * (boxW * 0.16);

    const p1 = { x: 0, y: -size * (0.8 + Math.random() * 0.4) };
    const p2 = { x: size * (0.6 + Math.random() * 0.4), y: size * (0.2 + Math.random() * 0.3) };
    const p3 = { x: -size * (0.4 + Math.random() * 0.4), y: size * (0.5 + Math.random() * 0.4) };

    glassShards.push({
      x: cx + Math.cos(angle) * (boxW * 0.25),
      y: cy + Math.sin(angle) * (boxH * 0.25),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (3.0 + Math.random() * 4.5),
      pts: [p1, p2, p3],
      size: size,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.35,
      color: palette[i % palette.length]
    });
  }

  // 6. Expanding rectangular shockwave pulse
  const shockwave = {
    x: cx,
    y: cy,
    w: boxW,
    h: boxH,
    maxScale: 1.75,
    timer: 0,
    maxTimer: 14
  };

  _shutterGlassBreaks.push({
    corners: cornerFragments,
    shards: glassShards,
    shockwave: shockwave,
    life: 1.0,
    maxLife: 1.0,
    decay: 0.022
  });
}

/**
 * Updates physics for all active shutter glass break animations.
 */
export function updateShutterGlassBreaks() {
  if (_shutterGlassBreaks.length === 0) return;

  const gravity = 0.30;
  const drag = 0.985;

  for (let b = _shutterGlassBreaks.length - 1; b >= 0; b--) {
    const effect = _shutterGlassBreaks[b];
    effect.life -= effect.decay;

    if (effect.life <= 0) {
      _shutterGlassBreaks.splice(b, 1);
      continue;
    }

    // Update corner frame pieces
    for (let i = 0; i < effect.corners.length; i++) {
      const c = effect.corners[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += gravity * 0.85;
      c.vx *= drag;
      c.vy *= drag;
      c.rot += c.rotSpeed;
    }

    // Update glass shards
    for (let i = 0; i < effect.shards.length; i++) {
      const s = effect.shards[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += gravity;
      s.vx *= drag;
      s.vy *= drag;
      s.rot += s.rotSpeed;
    }

    // Update shockwave pulse
    if (effect.shockwave && effect.shockwave.timer < effect.shockwave.maxTimer) {
      effect.shockwave.timer++;
    }
  }
}

/**
 * Renders all active 24 FPS shutter glass breaking animations.
 * Adheres strictly to Rule 11 (Zero shadowBlur) and Rule 2.4 (Transform Stack Integrity).
 * @param {CanvasRenderingContext2D} ctx
 */
export function drawShutterGlassBreaks(ctx) {
  if (_shutterGlassBreaks.length === 0) return;

  for (let b = 0; b < _shutterGlassBreaks.length; b++) {
    const effect = _shutterGlassBreaks[b];
    const alpha = Math.max(0, Math.min(1.0, effect.life));

    // 1. Draw Expanding Rectangular Shockwave Pulse
    if (effect.shockwave && effect.shockwave.timer < effect.shockwave.maxTimer) {
      const sw = effect.shockwave;
      const progress = sw.timer / sw.maxTimer;
      const curScale = 1.0 + progress * (sw.maxScale - 1.0);
      const swAlpha = (1.0 - progress) * 0.85;

      ctx.save();
      ctx.translate(sw.x, sw.y);
      ctx.scale(curScale, curScale);

      // Outer Cyan shockwave rect
      ctx.strokeStyle = `rgba(0, 242, 254, ${swAlpha})`;
      ctx.lineWidth = 1.8 * (1.0 - progress * 0.5);
      ctx.strokeRect(-sw.w / 2, -sw.h / 2, sw.w, sw.h);

      // Inner Lime accent rect
      ctx.strokeStyle = `rgba(118, 224, 66, ${swAlpha * 0.75})`;
      ctx.lineWidth = 1.0;
      ctx.strokeRect(-sw.w / 2 + 2, -sw.h / 2 + 2, sw.w - 4, sw.h - 4);

      ctx.restore();
    }

    // 2. Draw 4 Shattered Corner Frame Pieces
    for (let i = 0; i < effect.corners.length; i++) {
      const c = effect.corners[i];
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.globalAlpha = alpha;

      const cw = c.w;
      const ch = c.h;

      // Film pane glass base
      ctx.fillStyle = `rgba(0, 242, 254, ${0.25 * alpha})`;
      ctx.fillRect(-cw / 2, -ch / 2, cw, ch);

      // Outer Cyan shutter frame border
      ctx.strokeStyle = '#00F2FE';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(-cw / 2, -ch / 2, cw, ch);

      // Inner Lime border
      ctx.strokeStyle = '#76E042';
      ctx.lineWidth = 1.0;
      ctx.strokeRect(-cw / 2 + 2, -ch / 2 + 2, cw - 4, ch - 4);

      // 35mm Sprocket holes along the lateral side
      ctx.fillStyle = '#12141A';
      const holeSize = 3.5;
      const isLeft = (c.cornerType === 'TL' || c.cornerType === 'BL');
      const hx = isLeft ? (-cw / 2 + 1) : (cw / 2 - holeSize - 1);
      ctx.fillRect(hx, -ch / 4 - holeSize / 2, holeSize, holeSize);
      ctx.fillRect(hx, ch / 4 - holeSize / 2, holeSize, holeSize);

      ctx.restore();
    }

    // 3. Draw 16 Sharp Polygonal Glass Crystal Shards
    for (let i = 0; i < effect.shards.length; i++) {
      const s = effect.shards[i];
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = alpha;

      const pts = s.pts;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let p = 1; p < pts.length; p++) {
        ctx.lineTo(pts[p].x, pts[p].y);
      }
      ctx.closePath();

      // Translucent tinted glass body
      ctx.fillStyle = s.color;
      ctx.fill();

      // Sharp pure white specular razor edge
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.stroke();

      // Dark manga ink border outline
      ctx.strokeStyle = 'rgba(14, 16, 21, 0.90)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let p = 1; p < pts.length; p++) {
        ctx.lineTo(pts[p].x, pts[p].y);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.restore();
    }
  }
}

/**
/**
 * Draws Sonic Boom Shockwave Ring for Skill 2, Flurry Punches & Dashes (Rule 11 Compliant).
 * (Disabled / Removed per user request)
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} currentRadius
 * @param {number} maxRadius
 * @param {number} progress
 * @param {number} [angle=0]
 */
export function drawSonicBoomRing(ctx, x, y, currentRadius, maxRadius, progress, angle = 0) {
  // Shockwave visual removed per user request
  return;
}

/**
 * Helper to render a clean 24-FPS projection ghost model.
 */
function _renderProjectionFrameCell(ctx, cx, cy, angle, r, alpha) {
  if (alpha <= 0.01) return;
  drawNaoyaGhostModel(ctx, cx, cy, angle, r, alpha * 0.55);
}

/**
 * Draws Naoya's single forward-projected 24-FPS ghost frame ahead of his movement trajectory,
 * as well as smoothly fading stepped afterimages left behind in his wake.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} fighter
 */
export function drawProjectionSorceryForwardFrames(ctx, fighter) {
  if (!fighter || fighter.isExecutingUlt) return;

  const r = fighter.r || 25;

  // 1. Draw all smoothly fading stepped afterimage frames left behind in his wake (pure trailing ghost models)
  if (fighter.steppedFrames && fighter.steppedFrames.length > 0) {
    for (let i = 0; i < fighter.steppedFrames.length; i++) {
      const sf = fighter.steppedFrames[i];
      if (sf && sf.alpha > 0.01) {
        drawNaoyaGhostModel(ctx, sf.x, sf.y, sf.angle || 0, r, sf.alpha);
      }
    }
  }
}

/**
 * Draws bursting 24-FPS Film Frame Step Pops when Naoya steps onto projected frames.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} fighter
 */
export function drawProjectionFrameStepPops(ctx, fighter) {
  // Pure afterimage aesthetic: Extra clutter rings, brackets, and square particles removed
}

/**
 * Computes the smooth elliptical runway path around the entire screen matching the user's diagram:
 * Sweeps from the enemy out the top of the arena, wide around the left side, deep below the arena, and back up through the enemy.
 * @param {Object} arena
 * @param {number} canvasW
 * @param {number} canvasH
 * @param {Object} target
 * @returns {Object}
 */
export function getNaoyaScreenRunwayPoints(arena, canvasW = 540, canvasH = 960, target = null, startPos = null, pathAngle = 0) {
  const ax = arena ? arena.x : 40;
  const ay = arena ? arena.y : 170;
  const aw = arena ? arena.width : 460;
  const ah = arena ? arena.height : 460;

  const tx = target && typeof target.x === 'number' ? target.x : (ax + aw * 0.50);
  const ty = target && typeof target.y === 'number' ? target.y : (ay + ah * 0.50);

  const sx = startPos && typeof startPos.x === 'number' && Number.isFinite(startPos.x) ? startPos.x : (ax + aw * 0.50);
  const sy = startPos && typeof startPos.y === 'number' && Number.isFinite(startPos.y) ? startPos.y : (ay + ah * 0.50);

  const cfg = (typeof CONFIG !== 'undefined' && CONFIG.naoya) ? CONFIG.naoya : {};
  const rx = cfg.ultRunwayRadiusX ?? Math.max(800, aw * 1.8);
  const ry = cfg.ultRunwayRadiusY ?? Math.max(1600, ah * 3.5);

  const forwardAngle = typeof pathAngle === 'number' ? pathAngle : 0;
  const ux = Math.cos(forwardAngle);
  const uy = Math.sin(forwardAngle);
  const vx = -uy;
  const vy = ux;

  // Determine which lateral side to loop around
  const toTargetX = tx - sx;
  const toTargetY = ty - sy;
  const cross = ux * toTargetY - uy * toTargetX;
  const sideSign = cross >= 0 ? 1 : -1;

  // Smooth continuous Catmull-Rom runway control points with straight supersonic breach vector into the target
  const p0 = { x: sx, y: sy };
  const p1 = { x: sx + ux * (rx * 0.70) + vx * (sideSign * ry * 0.25), y: sy + uy * (rx * 0.70) + vy * (sideSign * ry * 0.25) };
  const p2 = { x: sx + ux * (rx * 0.35) + vx * (sideSign * ry * 0.85), y: sy + uy * (rx * 0.35) + vy * (sideSign * ry * 0.85) };
  const p3 = { x: tx - ux * (rx * 0.25) + vx * (sideSign * ry * 0.55), y: ty - uy * (rx * 0.25) + vy * (sideSign * ry * 0.55) };
  
  // Dedicated straight runway alignment vector aimed directly through the enemy
  const straightDist = cfg.ultBreachStraightDist ?? 140;
  const approachAngle = Math.atan2(ty - p3.y, tx - p3.x);
  const appUx = Math.cos(approachAngle);
  const appUy = Math.sin(approachAngle);
  const p4 = { x: tx - appUx * straightDist, y: ty - appUy * straightDist };
  const p5 = { x: tx, y: ty };

  const controlPoints = [p0, p0, p1, p2, p3, p4, p5, p5];

  const sampleCatmull = (pts, t) => {
    const numSections = pts.length - 3;
    const i = Math.min(numSections - 1, Math.max(0, Math.floor(t * numSections)));
    const u = (t * numSections) - i;

    const cp0 = pts[i];
    const cp1 = pts[i + 1];
    const cp2 = pts[i + 2];
    const cp3 = pts[i + 3];

    const u2 = u * u;
    const u3 = u2 * u;

    const x = 0.5 * (
      (2 * cp1.x) +
      (-cp0.x + cp2.x) * u +
      (2 * cp0.x - 5 * cp1.x + 4 * cp2.x - cp3.x) * u2 +
      (-cp0.x + 3 * cp1.x - 3 * cp2.x + cp3.x) * u3
    );

    const y = 0.5 * (
      (2 * cp1.y) +
      (-cp0.y + cp2.y) * u +
      (2 * cp0.y - 5 * cp1.y + 4 * cp2.y - cp3.y) * u2 +
      (-cp0.y + 3 * cp1.y - 3 * cp2.y + cp3.y) * u3
    );

    return { x, y };
  };

  // Precompute arc-length lookup table (256 samples) for 100% constant physical speed
  const numPts = 256;
  const rawPoints = [];
  const distances = [0];
  let totalDist = 0;

  for (let i = 0; i <= numPts; i++) {
    const t = i / numPts;
    const pt = sampleCatmull(controlPoints, t);
    rawPoints.push(pt);

    if (i > 0) {
      const prev = rawPoints[i - 1];
      const segDist = Math.hypot(pt.x - prev.x, pt.y - prev.y);
      totalDist += segDist;
      distances.push(totalDist);
    }
  }

  const points = rawPoints;
  points._isArcLengthEllipse = true;
  points.rawPoints = rawPoints;
  points.distances = distances;
  points.totalDist = totalDist;
  points.rx = rx;
  points.ry = ry;
  points.tx = tx;
  points.ty = ty;
  points.sx = sx;
  points.sy = sy;
  points.pathAngle = forwardAngle;

  return points;
}

/**
 * Samples the smooth elliptical runway trajectory with arc-length constant velocity at parameter t in [0, 1].
 * Returns { x, y, angle }
 * @param {Array|Object} points
 * @param {number} t
 * @returns {{ x: number, y: number, angle: number }}
 */
export function sampleNaoyaRunwaySpline(points, t) {
  const clampedT = Math.max(0, Math.min(1.0, t));

  if (points && points._isArcLengthEllipse && points.rawPoints && points.distances) {
    const targetDist = clampedT * points.totalDist;
    const raw = points.rawPoints;
    const dists = points.distances;
    const n = raw.length;

    // Binary search for segment containing targetDist
    let low = 0;
    let high = n - 2;
    let idx = 0;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (dists[mid] <= targetDist) {
        idx = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const d0 = dists[idx];
    const d1 = dists[idx + 1] || d0;
    const segLen = d1 - d0;
    const frac = segLen > 0.0001 ? Math.min(1, Math.max(0, (targetDist - d0) / segLen)) : 0;

    const p0 = raw[idx];
    const p1 = raw[Math.min(n - 1, idx + 1)];

    const x = p0.x + (p1.x - p0.x) * frac;
    const y = p0.y + (p1.y - p0.y) * frac;
    const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);

    return { x, y, angle };
  }

  const n = points ? points.length : 0;
  if (!points || n === 0) return { x: 0, y: 0, angle: 0 };
  if (n === 1) return { x: points[0].x, y: points[0].y, angle: 0 };

  const totalSegments = n - 1;
  const segmentIndex = Math.floor(clampedT * totalSegments);
  const localT = (clampedT * totalSegments) - segmentIndex;

  const p0 = points[Math.max(0, segmentIndex - 1)];
  const p1 = points[segmentIndex];
  const p2 = points[Math.min(n - 1, segmentIndex + 1)];
  const p3 = points[Math.min(n - 1, segmentIndex + 2)];

  const t2 = localT * localT;
  const t3 = t2 * localT;

  const x = 0.5 * (
    (2 * p1.x) +
    (-p0.x + p2.x) * localT +
    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
  );

  const y = 0.5 * (
    (2 * p1.y) +
    (-p0.y + p2.y) * localT +
    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
  );

  const dx = 0.5 * (
    (-p0.x + p2.x) +
    2 * (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * localT +
    3 * (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t2
  );

  const dy = 0.5 * (
    (-p0.y + p2.y) +
    2 * (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * localT +
    3 * (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t2
  );

  const angle = Math.atan2(dy, dx);
  return { x, y, angle };
}

/**
 * Draws Naoya's Mach 3 Runway Out-of-Bounds Orbit & Breach Visuals during Ultimate.
 * Features:
 * - Glowing 24-FPS screen-wide smooth elliptical acceleration runway track leading directly into enemy
 * - 24 FPS target lock box around target
 * - Sonic boom shockwave trails
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} fighter
 */
export function drawNaoyaMachRunwayVFX(ctx, fighter) {
  if (!fighter || !fighter.isExecutingUlt) return;

  const arena = (typeof state !== 'undefined' && state.arena) ? state.arena : { x: 40, y: 170, width: 460, height: 460 };
  const canvasW = (state.canvas && state.canvas.width) || 540;
  const canvasH = (state.canvas && state.canvas.height) || 960;
  const startPos = { x: fighter.ultStartX, y: fighter.ultStartY };
  const pathAngle = fighter.ultPathAngle || 0;
  const target = fighter.ultTarget;
  const targetPos = target ? {
    x: (typeof fighter.ultTargetX === 'number') ? fighter.ultTargetX : target.x,
    y: (typeof fighter.ultTargetY === 'number') ? fighter.ultTargetY : target.y,
    r: target.r || 25
  } : null;
  const points = getNaoyaScreenRunwayPoints(arena, canvasW, canvasH, targetPos || target, startPos, pathAngle);

  ctx.save();

  // 1. Discrete Projection Sorcery Ghost Afterimages along the Runway Path (Pure Ghost Models)
  if (fighter.ultPhase === 1) {
    const pulse = 0.5 + 0.5 * Math.sin((fighter.ultTimer || 0) * 0.35);
    const r = fighter.r || 25;
    const currentProgress = Math.min(1.0, Math.max(0, fighter.ultRunwayProgress || 0));
    const numFrames = CONFIG.naoya?.ultRunwayAfterimageCount ?? 42;
    const spacingPower = CONFIG.naoya?.ultRunwaySpacingPower ?? 2.1;
    const baseAlphaCfg = CONFIG.naoya?.ultAfterimageAlpha ?? 0.38;
    const cachedCanvas = getNaoyaCachedCanvas(r);

    const targetX = targetPos ? targetPos.x : (target ? target.x : 0);
    const targetY = targetPos ? targetPos.y : (target ? target.y : 0);
    const targetR = targetPos ? targetPos.r : ((target && target.r) ? target.r : 25);

    // Draw all active stepped afterimages that fade out 1 by 1 sequentially
    if (fighter.steppedRunwayFrames && fighter.steppedRunwayFrames.length > 0) {
      for (let i = 0; i < fighter.steppedRunwayFrames.length; i++) {
        const af = fighter.steppedRunwayFrames[i];
        if (af && af.alpha > 0.01) {
          drawNaoyaGhostModel(ctx, af.x, af.y, af.angle || 0, r, af.alpha);
        }
      }
    }

    // 2. 24 FPS Target Lock Box around target
    if (target && !target.isDead) {
      const boxR = targetR + 14;
      ctx.strokeStyle = `rgba(0, 242, 254, ${0.85 + 0.15 * pulse})`;
      ctx.lineWidth = 1.8;
      const c = 8;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(targetX - boxR, targetY - boxR + c);
      ctx.lineTo(targetX - boxR, targetY - boxR);
      ctx.lineTo(targetX - boxR + c, targetY - boxR);
      // Top-right
      ctx.moveTo(targetX + boxR - c, targetY - boxR);
      ctx.lineTo(targetX + boxR, targetY - boxR);
      ctx.lineTo(targetX + boxR, targetY - boxR + c);
      // Bottom-right
      ctx.moveTo(targetX + boxR - c, targetY + boxR);
      ctx.lineTo(targetX + boxR, targetY + boxR);
      ctx.lineTo(targetX + boxR, targetY + boxR - c);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// ─────────────────────────────────────────────
// Naoya Mach 3 Chained Runway Speedlines Engine (Rule 16 Compliant)
// Multi-lane interlocking speed needle chains that bend & stream along the runway spline
// ─────────────────────────────────────────────
const _RUNWAY_CHAIN_LANES = [
  // 1. Center Core Chain (White Core / Pure Mach 3 Energy)
  { lateralNorm: 0.0, baseThick: 2.2, colorType: 'white', hasJointPins: true, phaseOffset: 0.0, speedMult: 1.15 },
  // 2. Inner Left Flank Chain (Electric Lime)
  { lateralNorm: -0.55, baseThick: 1.8, colorType: 'lime', hasJointPins: true, phaseOffset: 0.25, speedMult: 1.0 },
  // 3. Inner Right Flank Chain (Neon Shutter Cyan)
  { lateralNorm: 0.55, baseThick: 1.8, colorType: 'cyan', hasJointPins: true, phaseOffset: 0.50, speedMult: 1.0 },
  // 4. Outer Upper Flank Chain (Pale Gold)
  { lateralNorm: -1.05, baseThick: 1.4, colorType: 'gold', hasJointPins: false, phaseOffset: 0.75, speedMult: 0.90 },
  // 5. Outer Lower Flank Chain (Manga Obsidian Ink / Lime Edge)
  { lateralNorm: 1.05, baseThick: 1.4, colorType: 'ink', hasJointPins: false, phaseOffset: 0.10, speedMult: 0.90 },
  // 6. Wide Outer Left Whisps
  { lateralNorm: -1.45, baseThick: 1.1, colorType: 'cyan', hasJointPins: false, phaseOffset: 0.40, speedMult: 0.80 },
  // 7. Wide Outer Right Whisps
  { lateralNorm: 1.45, baseThick: 1.1, colorType: 'lime', hasJointPins: false, phaseOffset: 0.65, speedMult: 0.80 }
];

/**
 * Draws smooth fade-in Chained Manga Action Speed Lines that bend and stream along the curved Runway Path (Rule 16 Compliant).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} fighter
 * @param {Object} points
 */
export function drawNaoyaRunwaySpeedLines(ctx, fighter, points) {
  if (!fighter || !fighter.isExecutingUlt || fighter.ultPhase !== 1) return;
  if (!points || !points.rawPoints || points.rawPoints.length === 0) return;

  const p = Math.min(1.0, Math.max(0.0, fighter.ultRunwayProgress || 0));
  // Smoothly fades in as he begins accelerating fast: starts at p = 0.08, reaches full intensity at p = 0.50+
  if (p < 0.08) return;

  const rawFade = Math.min(1.0, (p - 0.08) / 0.42);
  const fadeAlpha = Math.sin(rawFade * (Math.PI / 2)); // Smooth sinusoidal ease-in 0.0 -> 1.0

  const r = fighter.r || 25;
  const timer = fighter.ultTimer || 0;

  // Number of links per chain grows as Mach 3 speed builds (4 links at start up to 10 links at peak)
  const numLinks = Math.min(10, Math.floor(4 + p * 6));
  // Progress spacing delta between links along the spline
  const baseDeltaT = 0.024 * (1.0 - p * 0.35);

  ctx.save();

  for (let l = 0; l < _RUNWAY_CHAIN_LANES.length; l++) {
    const lane = _RUNWAY_CHAIN_LANES[l];
    const lateralOffset = lane.lateralNorm * (r * 1.35);
    const deltaT = baseDeltaT / lane.speedMult;
    
    // Dynamic rippling chain flow along the spline curve
    const flowPhase = ((timer * (0.008 * lane.speedMult) + lane.phaseOffset * deltaT) % deltaT);

    for (let k = 0; k < numLinks; k++) {
      const linkT = p - (k * deltaT + flowPhase);
      if (linkT <= 0.005 || linkT >= 0.99) continue;

      const linkHeadT = Math.min(0.999, linkT + deltaT * 0.88);
      const ptTail = sampleNaoyaRunwaySpline(points, linkT);
      const ptHead = sampleNaoyaRunwaySpline(points, linkHeadT);

      // Perpendicular normal to runway curve at tail & head
      const normTailX = -Math.sin(ptTail.angle) * lateralOffset;
      const normTailY = Math.cos(ptTail.angle) * lateralOffset;
      const normHeadX = -Math.sin(ptHead.angle) * lateralOffset;
      const normHeadY = Math.cos(ptHead.angle) * lateralOffset;

      const tailX = ptTail.x + normTailX;
      const tailY = ptTail.y + normTailY;
      const headX = ptHead.x + normHeadX;
      const headY = ptHead.y + normHeadY;

      const midX = (headX + tailX) * 0.5;
      const midY = (headY + tailY) * 0.5;
      const avgAngle = (ptTail.angle + ptHead.angle) * 0.5;

      const thick = lane.baseThick * (0.85 + p * 0.45) * (1.0 - (k / numLinks) * 0.45);
      const perpNx = -Math.sin(avgAngle) * thick;
      const perpNy = Math.cos(avgAngle) * thick;

      // Link Opacity
      const falloff = Math.max(0.15, 1.0 - (k / numLinks) * 0.70);
      const linkAlpha = fadeAlpha * falloff;

      let fillColor;
      if (lane.colorType === 'lime') {
        fillColor = `rgba(118, 224, 66, ${linkAlpha * 0.90})`;
      } else if (lane.colorType === 'cyan') {
        fillColor = `rgba(0, 242, 254, ${linkAlpha * 0.90})`;
      } else if (lane.colorType === 'gold') {
        fillColor = `rgba(200, 230, 74, ${linkAlpha * 0.85})`;
      } else if (lane.colorType === 'white') {
        fillColor = `rgba(255, 255, 255, ${linkAlpha * 0.95})`;
      } else {
        fillColor = `rgba(18, 20, 26, ${linkAlpha * 0.75})`;
      }

      // 4-Point Filled Manga Speed Needle Polygon Link (Rule 16)
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(headX, headY);
      ctx.lineTo(midX + perpNx, midY + perpNy);
      ctx.lineTo(tailX, tailY);
      ctx.lineTo(midX - perpNx, midY - perpNy);
      ctx.closePath();
      ctx.fill();

      // White core needle on thicker links
      if (lane.colorType !== 'white' && lane.colorType !== 'ink' && thick > 1.3 && p > 0.30) {
        ctx.fillStyle = `rgba(255, 255, 255, ${linkAlpha * 0.85})`;
        ctx.beginPath();
        const coreHeadX = headX - (headX - tailX) * 0.15;
        const coreTailX = tailX + (headX - tailX) * 0.15;
        const coreHeadY = headY - (headY - tailY) * 0.15;
        const coreTailY = tailY + (headY - tailY) * 0.15;
        ctx.moveTo(coreHeadX, coreHeadY);
        ctx.lineTo(midX + perpNx * 0.38, midY + perpNy * 0.38);
        ctx.lineTo(coreTailX, coreTailY);
        ctx.lineTo(midX - perpNx * 0.38, midY - perpNy * 0.38);
        ctx.closePath();
        ctx.fill();
      }

      // Chain Joint Connection Pin Node
      if (lane.hasJointPins && k < numLinks - 1) {
        ctx.fillStyle = `rgba(255, 255, 255, ${linkAlpha * 0.95})`;
        ctx.beginPath();
        const pinR = Math.max(0.8, thick * 0.55);
        ctx.arc(tailX, tailY, pinR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}



