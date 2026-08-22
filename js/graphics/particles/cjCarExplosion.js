// ─────────────────────────────────────────────
// CJ's Greenwood Sedan Vehicle Detonation Explosion System
// Spawns a high-impact GTA vehicle explosion when the drive-by car is destroyed.
// Features: Multi-layered fireball shockwaves, flying burning metal wreckage debris,
// billowing dark smoke clouds, ground scorch crater with glowing embers,
// and AOE damage with physical knockback push.
// Rule 6, Rule 11 (Zero shadowBlur) & Rule 12 Compliant
// ─────────────────────────────────────────────

import { state, triggerGlobalScreenShake, spawnFloatingText } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { spawnImpactFlash, spawnSparks } from './sparkEffect.js';

if (typeof state !== 'undefined' && !state.cjCarExplosions) {
  state.cjCarExplosions = [];
}
if (typeof state !== 'undefined' && !state.cjCarScorchMarks) {
  state.cjCarScorchMarks = [];
}

/**
 * Spawns a grand vehicle detonation explosion at the destroyed car's location
 * @param {number} x Ground X coordinate
 * @param {number} y Ground Y coordinate
 * @param {number} carAngle Orientation angle of the car
 * @param {object} owner The CJ fighter who summoned the car
 */
export function spawnCarExplosion(x, y, carAngle = 0, owner = null) {
  if (typeof state === 'undefined') return;
  if (!state.cjCarExplosions) state.cjCarExplosions = [];
  if (!state.cjCarScorchMarks) state.cjCarScorchMarks = [];

  const posX = Number(x) || 0;
  const posY = Number(y) || 0;

  // ── 1. SPAWN GROUND SCORCH CRATER WITH GLOWING EMBERS ──
  state.cjCarScorchMarks.push({
    x: posX,
    y: posY,
    radius: 54 + Math.random() * 12,
    angle: carAngle || (Math.random() * Math.PI * 2),
    life: 360,     // 6 seconds on ground
    maxLife: 360,
    alpha: 0.85
  });
  if (state.cjCarScorchMarks.length > 6) {
    state.cjCarScorchMarks.shift();
  }

  // ── 2. CREATE FLYING METAL WRECKAGE CHUNKS & SHRAPNEL ──
  const debris = [];
  const debrisCount = 18;
  for (let i = 0; i < debrisCount; i++) {
    const angle = (Math.PI * 2 * i / debrisCount) + (Math.random() - 0.5) * 0.45;
    const speed = 4.5 + Math.random() * 8.5;
    const isTire = (i % 4 === 0);
    const isChrome = (i % 3 === 0);
    debris.push({
      x: posX,
      y: posY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (1.5 + Math.random() * 2.5),
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.35,
      size: isTire ? (9 + Math.random() * 4) : (5 + Math.random() * 7),
      width: isTire ? 12 : (6 + Math.random() * 8),
      height: isTire ? 12 : (3 + Math.random() * 4),
      type: isTire ? 'tire' : (isChrome ? 'chrome' : 'scrap'),
      color: isTire ? '#18181B' : (isChrome ? '#E2E8F0' : '#2D3748'),
      life: 45 + Math.floor(Math.random() * 25),
      maxLife: 70
    });
  }

  // ── 3. CREATE VOLUMETRIC BILLOWING SMOKE CLOUDS ──
  const smokePuffs = [];
  const smokeCount = 16;
  for (let s = 0; s < smokeCount; s++) {
    const sAngle = Math.random() * Math.PI * 2;
    const sDist = Math.random() * 28;
    const sSpeed = 1.2 + Math.random() * 3.8;
    smokePuffs.push({
      x: posX + Math.cos(sAngle) * sDist,
      y: posY + Math.sin(sAngle) * sDist,
      vx: Math.cos(sAngle) * sSpeed,
      vy: Math.sin(sAngle) * sSpeed - (0.8 + Math.random() * 1.5),
      radius: 18 + Math.random() * 22,
      maxRadius: 46 + Math.random() * 32,
      growth: 1.2 + Math.random() * 1.6,
      life: 38 + Math.floor(Math.random() * 24),
      maxLife: 62,
      shade: (Math.random() > 0.4) ? '#18181B' : '#27272A'
    });
  }

  // ── 4. CREATE MAIN EXPLOSION EVENT ──
  state.cjCarExplosions.push({
    x: posX,
    y: posY,
    timer: 0,
    maxTimer: 48,
    fireballRadius: 0,
    maxFireballRadius: 96,
    shockwaveRadius: 0,
    maxShockwaveRadius: 155,
    debris,
    smokePuffs
  });

  // ── 5. AUDIO BLAST & SCREEN SHAKE ──
  audioSystem.playSFX('Assets/Sound Effects/Attacks/groundSmash.mp3', 1.0);
  audioSystem.playSFX('Assets/Sound Effects/Attacks/explosion.mp3', 0.95);
  audioSystem.playSFX('Assets/Sound Effects/Skills/machinebroken.mp3', 0.80);

  if (typeof triggerGlobalScreenShake === 'function') {
    triggerGlobalScreenShake(12, 12);
  }

  if (typeof spawnImpactFlash === 'function') {
    spawnImpactFlash(posX, posY, 90, '#F97316');
    spawnImpactFlash(posX, posY, 55, '#FEF08A');
  }
  if (typeof spawnSparks === 'function') {
    spawnSparks(posX, posY, 24, 'orange', '#F97316');
    spawnSparks(posX, posY, 20, 'gold', '#FBBF24');
    spawnSparks(posX, posY, 16, 'crimson', '#374151');
  }

  // ── 6. RULE 6 UNIFIED QUERY: VEHICLE DETONATION AOE DAMAGE & KNOCKBACK ──
  const aoeRadius = 145;
  const aoeDamage = 50;
  const aoeKnockback = 24;

  const allCandidates = [
    ...(state.fighters || []),
    ...(state.illusions || [])
  ];

  const myIndex = (state.fighters && owner) ? state.fighters.indexOf(owner) : -1;
  const myTeam = (typeof state.getFighterTeam === 'function' && myIndex >= 0) ? state.getFighterTeam(myIndex) : null;

  for (const ent of allCandidates) {
    if (!ent || ent === owner || ent.dead || ent.hp <= 0 || (ent.invincibilityTimer || 0) > 0 || ent.owner === owner) continue;

    if (typeof state.getFighterTeam === 'function' && myTeam !== null) {
      if (ent.owner) {
        const ownerTeam = state.getFighterTeam(state.fighters.indexOf(ent.owner));
        if (ownerTeam !== null && myTeam === ownerTeam) continue;
      } else {
        const entTeam = state.getFighterTeam(state.fighters.indexOf(ent));
        if (entTeam !== null && myTeam === entTeam) continue;
      }
    }

    const dx = ent.x - posX;
    const dy = ent.y - posY;
    const dist = Math.hypot(dx, dy);

    if (dist <= aoeRadius + (ent.r || 20)) {
      const isGojoInfinity = (ent.characterId === 'gojo' || ent.type === 'gojo') &&
        !ent.isMeleeMode &&
        ((ent.infinityCooldown || 0) <= 0 || ent.infinityActive);

      if (isGojoInfinity) {
        if (typeof ent.triggerInfinityBlock === 'function') {
          ent.triggerInfinityBlock(posX, posY, owner);
        }
        continue; // Explosion shockwave cannot penetrate Limitless Infinity!
      }

      // Deal explosion damage
      if (typeof ent.takeDamage === 'function') {
        ent.takeDamage(aoeDamage, owner || null, { isSkill: true });
      }

      // Strong physical blast knockback
      const blastAngle = Math.atan2(dy, dx);
      const distFalloff = Math.max(0.4, 1.0 - (dist / aoeRadius));
      const pushForce = aoeKnockback * distFalloff;
      ent.vx = (ent.vx || 0) + Math.cos(blastAngle) * pushForce;
      ent.vy = (ent.vy || 0) + Math.sin(blastAngle) * pushForce;

      if (typeof spawnImpactFlash === 'function') {
        spawnImpactFlash(ent.x, ent.y, 35, '#EF4444');
      }
      if (typeof spawnSparks === 'function') {
        spawnSparks(ent.x, ent.y, 10, 'orange', '#F97316');
      }
    }
  }
}

/**
 * Updates vehicle explosions, shrapnel physics, and ground scorch marks
 */
export function updateCarExplosions() {
  if (typeof state === 'undefined') return;

  // 1. Update Active Explosions
  if (state.cjCarExplosions && state.cjCarExplosions.length > 0) {
    for (let i = state.cjCarExplosions.length - 1; i >= 0; i--) {
      const exp = state.cjCarExplosions[i];
      if (!exp) continue;

      exp.timer++;
      const p = exp.timer / exp.maxTimer;

      // Expand fireball and shockwaves with fast initial surge
      exp.fireballRadius = exp.maxFireballRadius * Math.pow(Math.min(1, p * 2.5), 0.65);
      exp.shockwaveRadius = exp.maxShockwaveRadius * Math.pow(Math.min(1, p * 1.8), 0.75);

      // Update flying wreckage shrapnel
      if (exp.debris && exp.debris.length > 0) {
        for (let d = exp.debris.length - 1; d >= 0; d--) {
          const deb = exp.debris[d];
          deb.x += deb.vx;
          deb.y += deb.vy;
          deb.vx *= 0.94; // Air friction
          deb.vy += 0.18; // Gravity fall
          deb.rot += deb.rotSpeed;
          deb.life--;
          if (deb.life <= 0) {
            exp.debris.splice(d, 1);
          }
        }
      }

      // Update billowing smoke clouds
      if (exp.smokePuffs && exp.smokePuffs.length > 0) {
        for (let s = exp.smokePuffs.length - 1; s >= 0; s--) {
          const smk = exp.smokePuffs[s];
          smk.x += smk.vx;
          smk.y += smk.vy;
          smk.vx *= 0.92;
          smk.vy *= 0.92;
          smk.radius = Math.min(smk.maxRadius, smk.radius + smk.growth);
          smk.life--;
          if (smk.life <= 0) {
            exp.smokePuffs.splice(s, 1);
          }
        }
      }

      if (exp.timer >= exp.maxTimer && (!exp.debris || exp.debris.length === 0) && (!exp.smokePuffs || exp.smokePuffs.length === 0)) {
        state.cjCarExplosions.splice(i, 1);
      }
    }
  }

  // 2. Update Ground Scorch Marks
  if (state.cjCarScorchMarks && state.cjCarScorchMarks.length > 0) {
    for (let s = state.cjCarScorchMarks.length - 1; s >= 0; s--) {
      const scorch = state.cjCarScorchMarks[s];
      scorch.life--;
      scorch.alpha = Math.max(0, (scorch.life / scorch.maxLife) * 0.85);
      if (scorch.life <= 0) {
        state.cjCarScorchMarks.splice(s, 1);
      }
    }
  }
}

let _cachedExplosionSmokeGrad = null;
let _cachedScorchGrad = null;

function _getExplosionSmokeGrad(ctx) {
  if (!_cachedExplosionSmokeGrad) {
    _cachedExplosionSmokeGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 32);
    _cachedExplosionSmokeGrad.addColorStop(0, 'rgba(24, 24, 27, 0.85)');
    _cachedExplosionSmokeGrad.addColorStop(0.65, 'rgba(39, 39, 42, 0.45)');
    _cachedExplosionSmokeGrad.addColorStop(1, 'rgba(9, 9, 11, 0)');
  }
  return _cachedExplosionSmokeGrad;
}

function _getScorchGrad(ctx) {
  if (!_cachedScorchGrad) {
    _cachedScorchGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 60);
    _cachedScorchGrad.addColorStop(0, 'rgba(12, 12, 14, 0.95)');
    _cachedScorchGrad.addColorStop(0.5, 'rgba(24, 24, 27, 0.75)');
    _cachedScorchGrad.addColorStop(0.85, 'rgba(39, 39, 42, 0.35)');
    _cachedScorchGrad.addColorStop(1, 'rgba(15, 15, 20, 0)');
  }
  return _cachedScorchGrad;
}

/**
 * Draws ground scorch marks left by car explosions (Cached high-performance)
 */
export function drawCarScorchMarks(ctx) {
  if (typeof state === 'undefined' || !state.cjCarScorchMarks || state.cjCarScorchMarks.length === 0) return;

  ctx.save();
  for (let i = 0; i < state.cjCarScorchMarks.length; i++) {
    const sc = state.cjCarScorchMarks[i];
    if (!sc || sc.alpha <= 0) continue;

    ctx.save();
    ctx.translate(sc.x, sc.y);
    ctx.rotate(sc.angle);
    ctx.scale((sc.radius / 60) * 1.25, (sc.radius / 60) * 0.75); // Elongated vehicle footprint

    // Burnt charcoal crater gradient (Cached)
    ctx.globalAlpha = sc.alpha;
    ctx.fillStyle = _getScorchGrad(ctx);
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.fill();

    // Lingering incandescent glowing ember sparks
    if (sc.life > sc.maxLife * 0.4) {
      const emberAlpha = Math.min(1.0, (sc.life / sc.maxLife)) * (0.4 + Math.sin(Date.now() * 0.008) * 0.2);
      ctx.fillStyle = `rgba(249, 115, 22, ${emberAlpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(-8, 3, 2.5, 0, Math.PI * 2);
      ctx.arc(12, -4, 2.0, 0, Math.PI * 2);
      ctx.arc(4, 8, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
  ctx.restore();
}

/**
 * Draws active car explosions, fireballs, shockwaves, smoke, and flying shrapnel (Cached high-performance)
 */
export function drawCarExplosions(ctx) {
  if (typeof state === 'undefined' || !state.cjCarExplosions || state.cjCarExplosions.length === 0) return;

  ctx.save();

  for (let i = 0; i < state.cjCarExplosions.length; i++) {
    const exp = state.cjCarExplosions[i];
    if (!exp) continue;

    const p = exp.timer / exp.maxTimer;

    // ── 1. BILLOWING VOLUMETRIC SMOKE PLUMES (Cached) ──
    if (exp.smokePuffs && exp.smokePuffs.length > 0) {
      for (const smk of exp.smokePuffs) {
        const smkAlpha = Math.min(0.75, (smk.life / smk.maxLife) * 0.75);

        ctx.save();
        ctx.translate(smk.x, smk.y);
        ctx.scale(smk.radius / 32, smk.radius / 32);
        ctx.globalAlpha = smkAlpha;
        ctx.fillStyle = _getExplosionSmokeGrad(ctx);
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // ── 2. EXPANDING FIERY SHOCKWAVE RING ──
    if (p < 0.75) {
      const swAlpha = (1 - (p / 0.75)) * 0.85;
      ctx.strokeStyle = `rgba(249, 115, 22, ${swAlpha.toFixed(3)})`;
      ctx.lineWidth = Math.max(1.5, 7.0 * (1 - p));
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.shockwaveRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Outer Crimson Ring
      ctx.strokeStyle = `rgba(239, 68, 68, ${(swAlpha * 0.6).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.0, 4.0 * (1 - p));
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.shockwaveRadius * 1.08, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ── 3. BLAZING MULTI-LAYERED FIREBALL CORE ──
    if (p < 0.65) {
      const fbAlpha = (1 - (p / 0.65));
      const fbGrad = ctx.createRadialGradient(exp.x, exp.y, 4, exp.x, exp.y, exp.fireballRadius);
      fbGrad.addColorStop(0, `rgba(255, 255, 255, ${(fbAlpha * 0.95).toFixed(3)})`); // Incandescent white core
      fbGrad.addColorStop(0.25, `rgba(254, 240, 138, ${(fbAlpha * 0.90).toFixed(3)})`); // Blazing yellow
      fbGrad.addColorStop(0.60, `rgba(249, 115, 22, ${(fbAlpha * 0.75).toFixed(3)})`); // Fiery orange
      fbGrad.addColorStop(0.85, `rgba(220, 38, 38, ${(fbAlpha * 0.40).toFixed(3)})`); // Crimson edge
      fbGrad.addColorStop(1, 'rgba(153, 27, 27, 0)');

      ctx.fillStyle = fbGrad;
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.fireballRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── 4. FLYING BURNING METAL WRECKAGE CHUNKS ──
    if (exp.debris && exp.debris.length > 0) {
      for (const deb of exp.debris) {
        const debAlpha = Math.min(1.0, (deb.life / deb.maxLife) * 1.5);
        ctx.save();
        ctx.translate(deb.x, deb.y);
        ctx.rotate(deb.rot);
        ctx.globalAlpha = debAlpha;

        if (deb.type === 'tire') {
          // Blown Tire Chunk
          ctx.fillStyle = '#18181B';
          ctx.strokeStyle = '#09090B';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(0, 0, deb.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          // Inner hub remnant
          ctx.fillStyle = '#64748B';
          ctx.beginPath();
          ctx.arc(0, 0, deb.size * 0.2, 0, Math.PI * 2);
          ctx.fill();
        } else if (deb.type === 'chrome') {
          // Twisted Chrome Bumper Piece
          ctx.fillStyle = '#E2E8F0';
          ctx.strokeStyle = '#94A3B8';
          ctx.lineWidth = 0.8;
          ctx.fillRect(-deb.width * 0.5, -deb.height * 0.5, deb.width, deb.height);
          ctx.strokeRect(-deb.width * 0.5, -deb.height * 0.5, deb.width, deb.height);
        } else {
          // Charred Metal Body Scrap
          ctx.fillStyle = '#374151';
          ctx.strokeStyle = '#1F2937';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(-deb.width * 0.5, -deb.height * 0.5);
          ctx.lineTo(deb.width * 0.5, -deb.height * 0.3);
          ctx.lineTo(deb.width * 0.4, deb.height * 0.5);
          ctx.lineTo(-deb.width * 0.4, deb.height * 0.4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }

        // Small flame trailing on the shrapnel
        if (deb.life > deb.maxLife * 0.3) {
          ctx.fillStyle = '#F97316';
          ctx.beginPath();
          ctx.arc(-deb.width * 0.3, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    }
  }

  ctx.restore();
}

/**
 * Clears all vehicle explosions and scorch marks on round reset
 */
export function clearCarExplosions() {
  if (typeof state === 'undefined') return;
  if (state.cjCarExplosions) state.cjCarExplosions.length = 0;
  if (state.cjCarScorchMarks) state.cjCarScorchMarks.length = 0;
}
