
import { state, getProjectiles } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
const getNow = () => Date.now();
import { drawBomberExplosionGraphic, drawBomberC4, drawBomberGrenade } from '../weapons/bomberWeaponGraphics.js';
import { drawShurikenProjectile, drawGraySwordProjectile, drawPoisonBottleCore, drawRedSniperGun, drawBlueAimbotGun } from '../weaponVisuals.js';
import { drawDopplegangerPurpleSword, drawDopplegangerBodyEffect } from '../weapons/dopplegangerWeaponGraphics.js';
import { drawTricksterBolt } from '../weapons/tricksterWeaponGraphics.js';
import { drawGojoOrb, drawPurpleOrbTrail } from '../weapons/gojoWeaponGraphics.js';


import { drawGunSlingerBullet, drawGunSlingerMuzzleFlash } from '../weapons/gunSlingerWeaponGraphics.js';
import { drawEngineerBullet, drawTurretBullet } from '../weapons/engineerWeaponGraphics.js';
import { drawRangerBullet } from '../weapons/rangerWeaponGraphics.js';
import { drawCrimsonSniperBullet } from '../weapons/crimsonsniperWeaponGraphics.js';
import { drawSukunaSlash, drawGhostBlade, drawSukunaCleave, drawSukunaFurnaceArrow, drawDivineFlameArrowConstruct } from '../weapons/sukunaWeaponGraphics.js';
import { drawMahoragaThrow } from '../weapons/mahoragaWeaponGraphics.js';
import { drawPoisonSpill } from '../weapons/alchemistWeaponGraphics.js';
let _fugaLocalTrailPool = [];

export function drawProjectiles() {
  const ctx = state.ctx;
  const projectiles = getProjectiles();
  const now = getNow(); // Cache time once for all projectiles

  // View culling - define arena bounds with padding
  const arena = CONFIG.arena;
  const cullPadding = 50;
  const minX = arena.x - cullPadding;
  const maxX = arena.x + arena.width + cullPadding;
  const minY = arena.y - cullPadding;
  const maxY = arena.y + arena.height + cullPadding;

  const isGojoDomainActive = state.fighters && state.fighters.some(f => f && (f.type === 'gojo' || (f._def && f._def.id === 'gojo')) && f.domainActive);

  projectiles.forEach((p) => {
    // Skip off-screen projectiles for performance
    if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
      return;
    }
    // === GOJO LIMITLESS INFINITY: Spatial Distortion Barrier Ring for Frozen Projectiles ===
    if (p.isFrozenByInfinity) {
      const fadeAlpha = (p.infinityFreezeTimer !== undefined && p.infinityFreezeTimer < 30) ? Math.max(0, p.infinityFreezeTimer / 30) : 1.0;
      ctx.save();
      ctx.globalAlpha = (ctx.globalAlpha || 1.0) * fadeAlpha;
      ctx.globalCompositeOperation = 'lighter';
      const time = Date.now();

      // Concentric Refraction Rings around frozen projectile (No solid filled cyan balls!)
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.r || 12) + 6 + Math.sin(time * 0.01) * 2, 0, Math.PI * 2);
      ctx.stroke();

      // Inner White Core Ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.r || 12) + 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    if (p.isExplosion) {
      if (p.isGlassShard) {
        const lifeRatio = p.life / p.maxLife;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.scale(lifeRatio, lifeRatio);

        ctx.beginPath();
        ctx.moveTo(0, -p.r);
        ctx.lineTo(p.r * 0.8, p.r * 0.8);
        ctx.lineTo(-p.r * 0.8, p.r * 0.3);
        ctx.closePath();

        ctx.fillStyle = `rgba(255, 255, 255, ${lifeRatio * 0.8})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(180, 255, 180, ${lifeRatio})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
        return;
      }

      // Save/restore to ensure no clip regions from previous drawings (like Cronos sphere) affect explosion rendering
      ctx.save();
      drawBomberExplosionGraphic(p);
      ctx.restore();
      return;
    }

    // â”€â”€ POISON SPILL: boiling liquid pool with foam, bubbles, and surface texture â”€â”€
    if (p.isPoisonSpill) {
      const lifeRatio = Math.max(0, Math.min(1, p.life / (p.maxLife || 1)));
      const fadeAlpha = lifeRatio;
      const baseRadius = p.r;
      const now = Date.now();

      ctx.save();

      // â”€â”€ Layer 1: Dark base shadow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      ctx.globalAlpha = fadeAlpha * 0.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, baseRadius * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = '#0d2b0d';
      ctx.fill();

      // â”€â”€ Layer 2: Main liquid pool with irregular boiling edge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      ctx.globalAlpha = fadeAlpha * 0.65;
      ctx.beginPath();
      // Draw irregular boiling edge using multiple arc segments
      const segments = 12;
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const wobble = Math.sin(now / 200 + i * 1.3) * 0.08 +
          Math.cos(now / 350 + i * 0.9) * 0.06 +
          Math.sin(now / 120 + i * 2.1) * 0.04;
        const r = baseRadius * (0.85 + wobble);
        const px = p.x + Math.cos(angle) * r;
        const py = p.y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      const liquidGrad = ctx.createRadialGradient(
        p.x - baseRadius * 0.15, p.y - baseRadius * 0.15, 0,
        p.x, p.y, baseRadius
      );
      liquidGrad.addColorStop(0, '#7dff7d');
      liquidGrad.addColorStop(0.3, '#4dff4d');
      liquidGrad.addColorStop(0.6, '#2eb82e');
      liquidGrad.addColorStop(1, '#1a5c1a');
      ctx.fillStyle = liquidGrad;
      ctx.fill();

      // â”€â”€ Layer 4: Boiling surface bubbles (popping and rising) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const bubbleCount = 10;
      for (let i = 0; i < bubbleCount; i++) {
        const seed = i * 137.5; // Golden angle for even distribution
        const bPhase = (now / 600 + seed) % 1;
        const bAngle = seed * 0.1;
        const bDist = (0.15 + (bPhase * 0.7)) * baseRadius;
        const bx = p.x + Math.cos(bAngle) * bDist;
        const by = p.y + Math.sin(bAngle) * bDist;
        // Bubbles grow then pop
        const bScale = bPhase < 0.7 ? bPhase / 0.7 : (1 - bPhase) / 0.3;
        const br = (2 + i % 3) * bScale;
        const bAlpha = Math.max(0, fadeAlpha * (bPhase < 0.7 ? 0.8 : bScale * 0.8));

        if (br > 0.5) {
          ctx.globalAlpha = bAlpha;
          ctx.fillStyle = '#b8ffb8';
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
          // Bubble highlight
          if (br > 1.5) {
            ctx.globalAlpha = bAlpha * 0.6;
            ctx.fillStyle = '#e0ffe0';
            ctx.beginPath();
            ctx.arc(bx - br * 0.3, by - br * 0.3, br * 0.35, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // â”€â”€ Layer 5: Surface ripples (expanding circles from random points) â”€â”€â”€â”€â”€â”€â”€â”€
      const rippleCount = 3;
      for (let r = 0; r < rippleCount; r++) {
        const rPhase = ((now / 900 + r * 0.33) % 1);
        const rAngle = r * 2.1 + now / 2000;
        const rDist = rPhase * baseRadius * 0.7;
        const rx = p.x + Math.cos(rAngle) * rDist;
        const ry = p.y + Math.sin(rAngle) * rDist;
        const rAlpha = (1 - rPhase) * fadeAlpha * 0.3;
        const rRadius = 3 + rPhase * 15;

        ctx.globalAlpha = rAlpha;
        ctx.strokeStyle = '#90ee90';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rx, ry, rRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // â”€â”€ Layer 6: Foam patches on surface â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      const foamCount = 5;
      for (let f = 0; f < foamCount; f++) {
        const fSeed = f * 97.3;
        const fX = p.x + Math.cos(fSeed * 0.1 + now / 3000) * baseRadius * 0.5;
        const fY = p.y + Math.sin(fSeed * 0.15 + now / 2500) * baseRadius * 0.5;
        const fSize = 4 + (f % 3) * 2;
        const fAlpha = (0.3 + Math.sin(now / 400 + fSeed) * 0.2) * fadeAlpha;

        ctx.globalAlpha = fAlpha;
        ctx.fillStyle = '#c8ffc8';
        ctx.beginPath();
        ctx.arc(fX, fY, fSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // â”€â”€ Layer 7: Inner glow core â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      ctx.globalAlpha = fadeAlpha * 0.4;
      const coreGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, baseRadius * 0.4);
      coreGrad.addColorStop(0, 'rgba(200,255,200,0.6)');
      coreGrad.addColorStop(1, 'rgba(77,255,77,0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, baseRadius * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    if (p.isGrenade) {
      // Draw tail trail
      if (p.history && p.history.length > 0) {
        ctx.beginPath();
        ctx.moveTo(p.history[0].x, p.history[0].y - p.history[0].z);
        for (let i = 1; i < p.history.length; i++) {
          ctx.lineTo(p.history[i].x, p.history[i].y - p.history[i].z);
        }
        ctx.lineTo(p.x, p.y - p.z);
        ctx.strokeStyle = 'rgba(77, 255, 77, 0.4)';
        ctx.lineWidth = p.r * 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      // Draw shadow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fill();

      // Draw grenade as a tumbling poison bottle
      ctx.save();
      ctx.translate(p.x, p.y - p.z);

      // Make the bottle tumble through the air
      // Base rotation direction on velocity
      const spinDirection = p.vx >= 0 ? 1 : -1;
      ctx.rotate((p.maxLife - p.life) * 0.25 * spinDirection);

      // Draw the bottle
      drawPoisonBottleCore(ctx, 0.9);
      ctx.restore();
      return;
    }

    // â”€â”€ C4 EXPLOSIVE: high-quality military C4 charge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (p.isC4) {
      const sparkPhase = (now / 200) % (Math.PI * 2);
      const rotation = p.rotation || 0;
      const zHeight = p.z || 0;

      // Get trail points if available
      const trailPoints = p.history || [];

      // Draw the high-quality C4
      drawBomberC4(ctx, p.x, p.y, p.r, {
        rotation: rotation,
        sparkPhase: sparkPhase,
        trailPoints: trailPoints,
        shadowAlpha: 0.25,
        zHeight: zHeight,
        isDeathC4: p.isDeathC4 || false,
        pulseIntensity: 1,
      });
      return;
    }

    if (p.isFlame) {
      // Skip individual flame drawing - flames are batched in drawFlames()
      // This improves performance by reducing draw calls
      return;
    }

    if (p.isBomberGrenade) {
      // â”€â”€ HIGH-QUALITY GRENADE DRAWING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      // Use the detailed grenade renderer from bomberWeaponGraphics.js
      const zOffset = p.z || 0;
      const sparkPhase = Date.now() / 100;

      // Get trail points for arc visualization
      const trailPoints = p.history ? p.history.slice(-6) : [];

      // Calculate rotation based on velocity for tumbling effect
      const rotation = Math.atan2(p.vy || 0, p.vx || 0) + Math.PI / 4;

      // Shadow alpha based on height
      const shadowAlpha = Math.max(0.1, 0.3 - zOffset * 0.01);

      // Draw the high-quality grenade
      drawBomberGrenade(ctx, p.x, p.y, p.r, {
        rotation: rotation,
        isSticky: p.isSticky || false,
        sparkPhase: sparkPhase,
        trailPoints: trailPoints,
        shadowAlpha: shadowAlpha,
        zHeight: zOffset,
      });

      return;
    }

    if (p.isC4) {
      const now = Date.now();
      const pulse = Math.sin(now / 150 + p.pulsePhase) * 0.15 + 1;
      const lifeRatio = p.life / p.maxLife;
      const urgency = 1 - lifeRatio;

      // Draw pulsing glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 1.5 * pulse, 0, Math.PI * 2);
      const glowColor = p.isDeathC4 ? `rgba(255, 0, 0, ${0.3 + urgency * 0.4})` : `rgba(255, 68, 68, ${0.3 + urgency * 0.4})`;
      ctx.fillStyle = glowColor;
      ctx.fill();

      // Draw C4 body
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw blinking light
      const blinkPhase = Math.sin(now / 100) > 0;
      ctx.beginPath();
      ctx.arc(p.x + p.r * 0.4, p.y - p.r * 0.3, 3, 0, Math.PI * 2);
      ctx.fillStyle = blinkPhase ? '#FF0000' : '#660000';
      ctx.fill();

      // Draw "C4" text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C4', p.x, p.y);

      // Draw countdown ring for death C4
      if (p.isDeathC4) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * lifeRatio));
        ctx.strokeStyle = `rgba(255, 0, 0, ${0.5 + urgency * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      return;
    }

    // Black hole visuals are now drawn in drawBlackHoleEffects() which is called BEFORE fighters
    // This ensures blackholes appear behind fighters instead of overlaying them
    if (p.isBlackHole) {
      return;
    }

    // Sword projectile visual
    if (p.visual === 'sword') {
      const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
      const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
      const angle = Math.atan2(vy, vx);
      // scale down a bit relative to typical fighter radius
      const owner = state.fighters && state.fighters[p.owner];
      const scale = owner ? Math.max(0.5, owner.r / 24) : 0.9;
      drawGraySwordProjectile(ctx, p.x, p.y, angle, scale);
      
      if (p.stoppedByCronosSphere || p.frozenByCronosSphere) {
         ctx.save();
         ctx.translate(p.x, p.y);
         ctx.rotate(angle);
         // Cyan time-stasis crystal casing around the sword
         ctx.fillStyle = 'rgba(0, 243, 255, 0.25)';
         ctx.strokeStyle = 'rgba(0, 243, 255, 0.7)';
         ctx.lineWidth = 2;
         ctx.beginPath();
         // Elongated ellipse matching the sword's profile
         ctx.ellipse(20 * scale, 0, 32 * scale, 10 * scale, 0, 0, Math.PI * 2);
         ctx.fill();
         ctx.stroke();
         // Inner bright core
         ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
         ctx.beginPath();
         ctx.ellipse(20 * scale, 0, 18 * scale, 4 * scale, 0, 0, Math.PI * 2);
         ctx.fill();
         ctx.restore();
      }
      return;
    }

    // Shuriken projectile visual
    if (p.visual === 'shuriken') {
      const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
      const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
      const angle = Math.atan2(vy, vx);
      // Add rotation for spinning effect
      const spinAngle = angle + (Date.now() / 100) % (Math.PI * 2);
      const owner = state.fighters && state.fighters[p.owner];
      const scale = owner ? Math.max(0.6, owner.r / 25) : 0.8;
      drawShurikenProjectile(ctx, p.x, p.y, spinAngle, scale);
      return;
    }

    // Sukuna slash visual
    if (p.visual === 'sukunaSlash') {
      if (typeof state !== 'undefined' && state.pixiApp) return;
      if (isGojoDomainActive) return;
      drawSukunaSlash(ctx, p);
      return;
    }

    // Ghost Blade visual
    if (p.visual === 'ghostBlade') {
      if (typeof state !== 'undefined' && state.pixiApp) return;
      if (isGojoDomainActive) return;
      drawGhostBlade(ctx, p);
      return;
    }

    // Sukuna Cleave visual
    if (p.visual === 'sukunaCleave') {
      if (typeof state !== 'undefined' && state.pixiApp) return;
      if (isGojoDomainActive) return;
      drawSukunaCleave(ctx, p);
      return;
    }

    // Sukuna Furnace Arrow
    if (p.visual === 'sukunaFurnaceArrow' || p.isSukunaFurnace) {
      if (typeof state !== 'undefined' && state.pixiApp) return;
      drawSukunaFurnaceArrow(ctx, p);
      return;
    }

    // Gun Slinger bullet visual - detailed brass/copper revolver bullets
    if (p.visual === 'gunslingerBullet') {
      const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
      const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
      const angle = Math.atan2(vy, vx);
      const owner = state.fighters && state.fighters[p.owner];
      const scale = owner ? Math.max(0.7, owner.r / 22) : 1.0;
      const lifeRatio = Math.max(0.3, (p.life || 30) / (p.maxLife || 30));

      drawGunSlingerBullet(ctx, p.x, p.y, angle, scale, lifeRatio);
      return;
    }

    // Engineer bullet visual - brass tracer rounds with hot glow trail
    if (p.visual === 'EngineerBullet') {
      const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
      const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
      const angle = Math.atan2(vy, vx);
      const owner = state.fighters && state.fighters[p.owner];
      const scale = owner ? Math.max(0.6, owner.r / 20) : 0.9;
      const lifeRatio = Math.max(0.4, (p.life || 40) / (p.maxLife || 40));

      drawEngineerBullet(ctx, p.x, p.y, angle, scale, lifeRatio);
      return;
    }

    if (p.visual === 'turretBullet') {
      const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
      const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
      const angle = Math.atan2(vy, vx);
      const owner = state.fighters && state.fighters[p.owner];
      const scale = owner ? Math.max(0.6, owner.r / 20) : 0.9;
      const lifeRatio = Math.max(0.4, (p.life || 40) / (p.maxLife || 40));

      drawTurretBullet(ctx, p.x, p.y, angle, scale, lifeRatio);
      return;
    }

    // Add rangerBullet handler
    if (p.visual === 'rangerBullet') {
      drawRangerBullet(ctx, p);
      return;
    }

    // Layla Steampunk Cannon - Streamlined Cyan Laser Bolt (Compressed Plasma & Wind Drill)
    if (p.visual === 'layla_basic_bullet') {
      // Rendered on Canvas 2D (top layer over PixiJS WebGL)
      ctx.save();
      ctx.translate(p.x, p.y);
      drawLaylaBasicBullet(ctx, p);
      ctx.restore();
      return;
    }

    // Layla Steampunk Cannon - Ultimate Plasma Bolt (Massive Compressed Plasma & Wind Drill)
    if (p.visual === 'layla_ultimate_bullet') {
      // Rendered on Canvas 2D (top layer over PixiJS WebGL)
      ctx.save();
      ctx.translate(p.x, p.y);
      drawLaylaUltimateBullet(ctx, p);
      ctx.restore();
      return;
    }

    // Layla Steampunk Cannon - Compressed Sky-Blue Energy Missile (Malefic Bomb)
    if (p.visual === 'layla_bomb') {
      // Rendered on Canvas 2D (top layer over PixiJS WebGL)
      ctx.save();
      ctx.translate(p.x, p.y);
      drawLaylaBomb(ctx, p);
      ctx.restore();
      return;
    }

    // Layla Steampunk Cannon - Cyan Energy Cosmic Blast Pattern (Malefic Bomb Explosion)
    if (p.visual === 'layla_cosmic_blast') {
      // Rendered on Canvas 2D (top layer over PixiJS WebGL)
      ctx.save();
      ctx.translate(p.x, p.y);
      drawLaylaCosmicBlast(ctx, p);
      ctx.restore();
      return;
    }

    // Crimson Sniper bullet
    if (p.visual === 'crimsonSniperBullet') {
      drawCrimsonSniperBullet(ctx, p, false);
      return;
    }
    if (p.visual === 'crimsonSniperBullet_enhanced') {
      drawCrimsonSniperBullet(ctx, p, true, false);
      return;
    }
    
    if (p.visual === 'tricksterSniperBullet_enhanced') {
      drawCrimsonSniperBullet(ctx, p, true, true);
      return;
    }

    // Zeus Chain Lightning Visual
    if (p.visual === 'chainLightning') {
      ctx.save();
      const isGamePlay = (typeof state !== 'undefined' && state.gameState && ['fight', 'countdown', 'paused', 'roundEnd'].includes(state.gameState));
      
      // Draw a bright glowing white core at the leading tip with a strong blue aura
      if (!isGamePlay) {
        // Full-quality: layered glow rings
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 191, 255, 0.2)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 191, 255, 0.5)';
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      
      // Draw jagged trail with motion blur and thinning effect
      if (p.history && p.history.length > 1) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'miter';
        
        // Loop from oldest (i=0) to newest (i = length-2)
        for (let i = 0; i < p.history.length - 1; i++) {
          // Rapidly thin out: older segments are thinner
          const progress = i / (p.history.length - 1);
          const thickness = 0.5 + progress * 4.5;
          
          // Disconnected zig-zags for motion blur: randomly skip some segments
          if (Math.random() < 0.25) continue;
          
          const pt1 = p.history[i];
          const pt2 = p.history[i+1];
          
          ctx.beginPath();
          
          // Small local jitter for even more jaggedness
          const j1x = pt1.x + (Math.random() - 0.5) * 4;
          const j1y = pt1.y + (Math.random() - 0.5) * 4;
          const j2x = pt2.x + (Math.random() - 0.5) * 4;
          const j2y = pt2.y + (Math.random() - 0.5) * 4;
          
          ctx.moveTo(j1x, j1y);
          ctx.lineTo(j2x, j2y);
          
          // 1. Draw softer blue aura
          ctx.strokeStyle = 'rgba(0, 191, 255, 0.3)';
          ctx.lineWidth = thickness + 2;
          ctx.stroke();
          
          // 2. Draw purely white core
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = thickness;
          ctx.stroke();
        }
      }
      
      ctx.restore();
      return;
    }

    if (p.isArcaneBolt) {
      drawTricksterBolt(ctx, p);
      return;
    }

    if (p.visual === 'gojoBlue' || p.isGojoPurple) {
      // Defer to hybridProjectileRenderer.js
      return;
    }

    // Mahoraga concrete/basalt thrown debris visuals
    if (p.visual === 'mahoragaBasaltMonolith' || p.visual === 'mahoragaRuinConcrete' || p.visual === 'mahoragaLavaRubble') {
      drawMahoragaThrow(ctx, p);
      return;
    }

    // Default projectile draw
    // Make projectile visuals depend on the owner projectile color/type.
    // RED: red-orange motion trail; BLUE: cyan â€œlaser-ishâ€ streak.
    const isRed = (p.color && p.color.toLowerCase().includes('ff4d4d')) ||
      (p.color && p.color.toLowerCase().includes('ff') && p.color.toLowerCase().includes('4d'));
    const isBlue = (p.color && p.color.toLowerCase().includes('4da3ff')) ||
      (p.color && p.color.toLowerCase().includes('a3') && p.color.toLowerCase().includes('ff')) ||
      (p.color && p.color.toLowerCase().includes('00ffff'));

    if (p.history && p.history.length > 1 && (isRed || isBlue)) {
      ctx.save();
      // Removed 'lighter' composite operation so trails stay visible on white

      // Trail polyline
      ctx.beginPath();
      const first = p.history[0];
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < p.history.length; i++) {
        const pt = p.history[i];
        ctx.lineTo(pt.x, pt.y);
      }

      const tailAlpha = isBlue ? 0.28 : 0.35;
      ctx.strokeStyle = isBlue ? 'rgba(0, 220, 255, 0.95)' : p.color;
      ctx.globalAlpha = tailAlpha;
      ctx.lineWidth = Math.max(1.2, p.r * 0.9);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Stronger glow core along last segment
      const prev = p.history[p.history.length - 2];
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(p.x, p.y);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = Math.max(1.6, p.r * 1.35);
      ctx.stroke();

      ctx.restore();
    }

    // Projectile body core
    ctx.save();
    // Removed 'lighter' composite operation so it doesn't wash out to white

    const outerGlow = isBlue ? 'rgba(0, 220, 255, 0.10)' : 'rgba(255, 80, 80, 0.12)';
    const coreGlow = isBlue ? 'rgba(0, 240, 255, 0.22)' : 'rgba(255, 120, 120, 0.22)';

    // outer glow
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 2.0, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.fill();

    // main core
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    // Add dark stroke so it stands out against the white background
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // extra cyan/red-ish inner bloom
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = coreGlow;
    ctx.globalAlpha = 0.9;
    ctx.fill();

    ctx.restore();
  });
}


// ────â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DRAW â€” PROJECTILES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function drawBlackHoleVisual({
  ctx,
  p,
  alpha,
  now,
  eventHorizon,
  innerDiskR,
  outerDiskR,
  progress,
  rotateAngle = null,
  indicator = false,
}) {
  // Optional summon indicator ring
  if (indicator && p.indicatorTimer > 0) {
    const ip = p.indicatorTimer / (p.indicatorLife || 1);
    const ringProgress = 1 - ip;
    const ringRadius = (outerDiskR * 0.9) * (1 + ringProgress * 0.8);
    ctx.save();
    ctx.globalAlpha = Math.max(0, ip * 0.95) * alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(204,102,255,${0.85 * ip})`;
    ctx.lineWidth = Math.max(2, outerDiskR * 0.05) * (0.7 + ringProgress * 0.6);
    ctx.stroke();
    ctx.restore();
  }

  const pulse = 1 + Math.sin(now / 220) * 0.05;

  ctx.save();
  ctx.globalAlpha = alpha;
  
  ctx.translate(p.x, p.y);

  // If rotateAngle is provided, use it (usually for the projectile phase).
  // Otherwise, a slight wobble to give it life without spinning like a pinwheel.
  let diskRot = rotateAngle;
  if (diskRot === null || diskRot === undefined) {
    diskRot = Math.sin(now / 2500) * 0.15;
  }
  ctx.rotate(diskRot);

  // High-frequency energy flickering/throbbing (feels more natural than position jitter)
  const energyFlicker = 1 + (Math.sin(now / 15) * 0.03 + Math.cos(now / 23) * 0.02);

  // 1. Large background nebula glow (purple)
  const glowGrad = ctx.createRadialGradient(0, 0, eventHorizon * 0.5, 0, 0, outerDiskR * 2.8 * energyFlicker);
  glowGrad.addColorStop(0, `rgba(180, 50, 255, 0.4)`);
  glowGrad.addColorStop(0.3, `rgba(130, 20, 255, 0.25)`);
  glowGrad.addColorStop(1, `rgba(80, 0, 180, 0)`);
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, outerDiskR * 2.8 * energyFlicker, 0, Math.PI * 2);
  ctx.fill();

  // 2. The Horizontal Accretion Disk Flare (Interstellar style)
  ctx.globalCompositeOperation = 'screen';
  
  // Apply the intense flicker directly to the flare width/height
  const streakWidth = outerDiskR * 3.5 * pulse * energyFlicker;
  const streakHeight = eventHorizon * 0.35 * energyFlicker;
  
  ctx.save();
  ctx.scale(1, streakHeight / streakWidth);
  
  // Outer flare
  ctx.beginPath();
  ctx.arc(0, 0, streakWidth, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(140, 30, 255, 0.4)`;
  ctx.fill();

  // Mid flare
  ctx.beginPath();
  ctx.arc(0, 0, streakWidth * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(200, 100, 255, 0.6)`;
  ctx.fill();
  
  // Inner core flare
  ctx.beginPath();
  ctx.arc(0, 0, streakWidth * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 180, 255, 0.8)`;
  ctx.fill();
  
  ctx.restore();

  // Very thin bright center line extending outwards
  ctx.save();
  ctx.scale(1, (streakHeight * 0.08) / (streakWidth * 1.5));
  ctx.beginPath();
  ctx.arc(0, 0, streakWidth * 1.5 * energyFlicker, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 255, 255, 0.9)`;
  ctx.fill();
  ctx.restore();

  // 3. The Photon Ring (Circular glow behind the event horizon)
  const ringR = eventHorizon * 1.15;
  ctx.beginPath();
  ctx.arc(0, 0, ringR, 0, Math.PI * 2);
  ctx.lineWidth = eventHorizon * 0.3;
  ctx.strokeStyle = `rgba(160, 40, 255, 0.6)`;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, eventHorizon * 1.08, 0, Math.PI * 2);
  ctx.lineWidth = eventHorizon * 0.12;
  ctx.strokeStyle = `rgba(230, 130, 255, 0.9)`;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, eventHorizon * 1.03, 0, Math.PI * 2);
  ctx.lineWidth = eventHorizon * 0.05;
  ctx.strokeStyle = `rgba(255, 255, 255, 1)`;
  ctx.stroke();
  
  ctx.globalCompositeOperation = 'source-over';

  // 4. Orbital swirling lines (thick, bright, 3D perspective, outside event horizon)
  ctx.globalCompositeOperation = 'screen'; 
  const lineCount = 8;
  for (let i = 0; i < lineCount; i++) {
    const orbitSpeed = (i % 2 === 0 ? 1 : -1) * (600 + i * 150);
    const orbitAngle = now / orbitSpeed + (i * Math.PI * 2) / lineCount;
    
    // X radius is large (accretion disk width)
    const orbitRadiusX = eventHorizon * 1.6 + (outerDiskR * 0.8) * (i / lineCount);
    
    // Y radius must be strictly larger than eventHorizon so it NEVER crosses the black hole!
    const orbitRadiusY = eventHorizon * 1.1 + (outerDiskR * 0.3) * (i / lineCount);
    
    const lineLength = Math.PI * 0.8 + 0.4 * Math.sin(now / 300 + i);
    
    ctx.beginPath();
    ctx.ellipse(0, 0, orbitRadiusX, orbitRadiusY, 0, orbitAngle, orbitAngle + lineLength);
    
    const lineAlpha = (0.6 + 0.4 * Math.sin(now / 200 + i)) * alpha;
    ctx.strokeStyle = `rgba(255, 180, 255, ${lineAlpha})`;
    ctx.lineWidth = Math.max(1, outerDiskR * 0.015); // Thinner elegant lines
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over'; 

  // 5. Small debris/pebbles getting sucked in
  const pebbleCount = Math.max(12, Math.min(25, Math.floor(outerDiskR * 0.25))); 
  for (let i = 0; i < pebbleCount; i++) {
    const timeOffset = i * 1337.5;
    const life = ((now + timeOffset) % 2000) / 2000;
    
    const dist = outerDiskR * 2.2 * (1 - Math.pow(life, 2)) + eventHorizon * 1.05;
    const ang = i * Math.PI * 2 / pebbleCount + life * Math.PI * 8 * (i % 2 === 0 ? 1 : -1);
    
    // Elliptical path that matches the swirling rings
    const px = Math.cos(ang) * dist;
    // Y is squished, but always maintains a safe distance from center
    const py = Math.sin(ang) * (eventHorizon * 1.05 + (dist - eventHorizon * 1.05) * 0.35);

    const fade = Math.sin(life * Math.PI); 

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(life * Math.PI * 15 + i);
    
    ctx.beginPath();
    const s = Math.max(2.5, outerDiskR * 0.035) * (1 - life * 0.3); 
    ctx.moveTo(-s, -s * 0.5);
    ctx.lineTo(s * 0.8, -s * 1.2);
    ctx.lineTo(s * 1.1, s * 0.7);
    ctx.lineTo(-s * 0.6, s);
    ctx.closePath();
    
    ctx.fillStyle = `rgba(220, 180, 255, ${0.95 * fade * alpha})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * fade * alpha})`;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // 6. The Event Horizon (Pure Black Hole in the center)
  // Drawn last so it perfectly covers anything passing behind/into it
  ctx.beginPath();
  ctx.arc(0, 0, eventHorizon, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0, 0, 0, 1)`;
  ctx.fill();
  
  // 7. Some tiny stars/particles in the background glow for the "space" feel
  const starCount = Math.floor(outerDiskR * 0.3);
  for (let i = 0; i < starCount; i++) {
    const rand1 = Math.sin(p.x * 12.9898 + i) * 43758.5453;
    const rand2 = Math.cos(p.y * 78.233 + i) * 43758.5453;
    const rDist = eventHorizon * 1.5 + (outerDiskR * 1.5) * (Math.abs(rand1) % 1);
    const rAng = (Math.abs(rand2) % 1) * Math.PI * 2 + now / 2000;
    
    const twinkle = 0.5 + 0.5 * Math.sin(now / (200 + i * 50));
    
    ctx.beginPath();
    ctx.arc(Math.cos(rAng) * rDist, Math.sin(rAng) * rDist, Math.max(0.5, outerDiskR * 0.01) * twinkle, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + 0.6 * twinkle})`;
    ctx.fill();
  }

  ctx.restore();
}

export function drawGojoPurpleOrb(ctx, p) {
  ctx.save();
  const colorType = p.isGojoPurple ? 'purple' : 'blue';
  const visualTime = p.visualTime || Date.now();
  
  if (p.isGojoPurple) {
    const lifeRatio = p.life / p.maxLife;
    if (lifeRatio < 0.3) {
      const fadeAlpha = lifeRatio / 0.3;
      ctx.globalAlpha = fadeAlpha;
    }
  }
  
  if (p.isGojoPurple && p.history && p.history.length > 1) {
    drawPurpleOrbTrail(ctx, p, visualTime);
  }
  
  drawGojoOrb(ctx, p.x, p.y, p.r, visualTime, colorType, 0);
  ctx.restore();
}

export function drawLaylaBomb(ctx, p) {
  const angle = Math.atan2(p.vy, p.vx);
  ctx.rotate(angle);
  
  const now = Date.now();
  const radius = p.r || 12;
  
  // 1. Magenta trailing ribbon (3 short segments, no per-point math)
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  const tailLen = radius * 3.5;
  ctx.strokeStyle = '#FF00FF';
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.4);
  ctx.lineTo(-tailLen, 0);
  ctx.moveTo(0, radius * 0.4);
  ctx.lineTo(-tailLen * 0.7, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-tailLen * 0.5, 0);
  ctx.stroke();

  // 2. Outer Soft Gold glow
  ctx.fillStyle = 'rgba(255, 170, 0, 0.12)';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 2.0, 0, Math.PI * 2);
  ctx.fill();

  // 3. Rotating Golden Steampunk Cog (6 teeth for lower cost)
  ctx.save();
  ctx.rotate(now * 0.01);
  ctx.fillStyle = '#FFAA00';
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.5;
  const gearTeeth = 6;
  const outerR = radius * 1.35;
  const innerR = radius * 0.85;
  ctx.beginPath();
  for (let i = 0; i < gearTeeth * 2; i++) {
    const gAngle = (i * Math.PI) / gearTeeth;
    const r = i % 2 === 0 ? outerR : innerR;
    const gx = Math.cos(gAngle) * r;
    const gy = Math.sin(gAngle) * r;
    if (i === 0) ctx.moveTo(gx, gy);
    else ctx.lineTo(gx, gy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 4. Magenta core: flat fill (no gradient per frame)
  ctx.fillStyle = '#FF00FF';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-radius * 0.2, -radius * 0.2, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();

  // 5. White crosshair
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-radius * 0.45, 0);
  ctx.lineTo(radius * 0.45, 0);
  ctx.moveTo(0, -radius * 0.45);
  ctx.lineTo(0, radius * 0.45);
  ctx.stroke();
}

export function drawLaylaCosmicBlast(ctx, p) {
  const progress = 1 - (p.life / (p.maxLife || 35));
  const fade = Math.sin((1 - progress) * (Math.PI / 2));
  const maxR = p.r || 75;
  const currentR = maxR * (0.35 + progress * 0.65);
  
  ctx.globalAlpha = fade;

  ctx.fillStyle = 'rgba(0, 229, 255, 0.1)';
  ctx.beginPath();
  ctx.arc(0, 0, currentR * 1.1, 0, Math.PI * 2);
  ctx.fill();
  
  const waveGrad = ctx.createRadialGradient(0, 0, currentR * 0.5, 0, 0, currentR);
  waveGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
  waveGrad.addColorStop(0.65, 'rgba(0, 229, 255, 0.5)');
  waveGrad.addColorStop(0.9, '#00E5FF');
  waveGrad.addColorStop(1, 'rgba(224, 255, 255, 0)');
  
  ctx.fillStyle = waveGrad;
  ctx.beginPath();
  ctx.arc(0, 0, currentR, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.2 * (1 - progress);
  ctx.beginPath();
  ctx.arc(0, 0, currentR * 0.93, 0, Math.PI * 2);
  ctx.stroke();

  if (progress < 0.75) {
    const starProgress = progress / 0.75;
    const starR = maxR * (0.85 - starProgress * 0.35);
    const rotation = progress * Math.PI * 0.8;
    
    ctx.save();
    ctx.rotate(rotation);
    ctx.beginPath();
    const points = 8;
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const r = i % 2 === 0 ? starR : starR * 0.28;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = '#00E5FF';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, starR * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
  }

  const shardCount = 8;
  ctx.fillStyle = '#E0FFFF';
  for (let i = 0; i < shardCount; i++) {
    const shardAngle = (i * Math.PI * 2) / shardCount + progress * 1.5;
    const dist = maxR * progress * (0.5 + (i % 2) * 0.45);
    const sx = Math.cos(shardAngle) * dist;
    const sy = Math.sin(shardAngle) * dist;
    const size = Math.max(0.5, (3.2 - progress * 2.8) * ((i % 2) + 1));
    
    ctx.beginPath();
    ctx.moveTo(sx, sy - size * 1.5);
    ctx.lineTo(sx + size * 1.5, sy);
    ctx.lineTo(sx, sy + size * 1.5);
    ctx.lineTo(sx - size * 1.5, sy);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawLaylaUltimateBullet(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  ctx.rotate(angle);

  // 1. Subtle outer aura (flat fill, no gradient)
  ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.fill();

  // 2. Tail: 2 straight tapered lines (no gradient, no sin wave per frame)
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3AB4F2';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-6, -5); ctx.lineTo(-90, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,229,255,0.4)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-6, 0); ctx.lineTo(-70, 0);
  ctx.stroke();

  // 3. Core body: solid cyan teardrop (no gradient)
  ctx.fillStyle = '#00E5FF';
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.bezierCurveTo(12, -8, -6, -9, -22, -3);
  ctx.lineTo(-26, 0);
  ctx.lineTo(-22, 3);
  ctx.bezierCurveTo(-6, 9, 12, 8, 26, 0);
  ctx.closePath();
  ctx.fill();

  // 4. Wind drill: 2 ellipses only (was 5)
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3AB4F2';
  ctx.beginPath();
  ctx.ellipse(10, 0, 6, 10, Math.PI / 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-4, 0, 6, 10, Math.PI / 8, 0, Math.PI * 2);
  ctx.stroke();

  // 5. White center beam
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 0); ctx.lineTo(-14, 0);
  ctx.stroke();
}

export function drawLaylaBasicBullet(ctx, p) {
  const vx = p.vx === 0 && p.vy === 0 && p._resumeVx !== undefined ? p._resumeVx : p.vx;
  const vy = p.vx === 0 && p.vy === 0 && p._resumeVy !== undefined ? p._resumeVy : p.vy;
  const angle = Math.atan2(vy, vx);
  ctx.rotate(angle);

  // 1. Subtle aura (flat fill, no gradient)
  ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();

  // 2. Tail: 2 straight lines (no gradient, no sin wave per frame)
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3AB4F2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-3, 3); ctx.lineTo(-60, 0);
  ctx.moveTo(-3, -3); ctx.lineTo(-50, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,229,255,0.35)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-3, 0); ctx.lineTo(-40, 0);
  ctx.stroke();

  // 3. Core: solid cyan teardrop (no gradient)
  ctx.fillStyle = '#00E5FF';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.bezierCurveTo(8, -5.5, -4, -6, -14, -2);
  ctx.lineTo(-16, 0);
  ctx.lineTo(-14, 2);
  ctx.bezierCurveTo(-4, 6, 8, 5.5, 18, 0);
  ctx.closePath();
  ctx.fill();

  // 4. 2 quick ellipse rings (was 4)
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#3AB4F2';
  ctx.beginPath();
  ctx.ellipse(6, 0, 4, 7, Math.PI / 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(-3, 0, 4, 7, Math.PI / 8, 0, Math.PI * 2);
  ctx.stroke();

  // 5. White center streak
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(15, 0); ctx.lineTo(-8, 0);
  ctx.stroke();
}
