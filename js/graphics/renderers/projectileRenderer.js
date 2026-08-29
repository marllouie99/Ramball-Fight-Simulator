
import { state, getProjectiles } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { updateEntityVisualScale } from './EntityRenderer.js';
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
import { drawGetsugaSlash, drawCeroBeam } from '../weapons/ichigoWeaponGraphics.js';
import { drawPoisonSpill } from '../weapons/alchemistWeaponGraphics.js';
import { drawJohnWickBullet, drawJohnWickShotgunPellet, drawJohnWickRifleBullet } from '../weapons/johnWickWeaponGraphics.js';
import { drawCjUziBullet, drawCjMinigunBullet } from '../weapons/cjWeaponGraphics.js';
import { _getUryuArrowImage } from '../weapons/uryuWeaponGraphics.js';
import { drawTacticalBullet } from '../../../Tactical Force/weapons/tacticalWeaponGraphics.js';
import { tacticalProjectileSystem } from '../../../Tactical Force/systems/tacticalProjectileSystem.js';
let _fugaLocalTrailPool = [];

export function drawProjectiles() {
  const ctx = state.ctx;
  const projectiles = getProjectiles();
  const now = getNow(); // Cache time once for all projectiles

  // Dedicated Tactical Force Projectiles
  if (typeof tacticalProjectileSystem !== 'undefined' && tacticalProjectileSystem.projectiles && tacticalProjectileSystem.projectiles.length > 0) {
    tacticalProjectileSystem.draw(ctx);
  }

  // View culling - define canvas bounds with generous padding so projectiles never clip out on screen
  const canvasW = (state.canvas && state.canvas.width) ? state.canvas.width : 540;
  const canvasH = (state.canvas && state.canvas.height) ? state.canvas.height : 960;
  const cullPadding = 250;
  const minX = -cullPadding;
  const maxX = canvasW + cullPadding;
  const minY = -cullPadding;
  const maxY = canvasH + cullPadding;

  const isGojoDomainActive = state.fighters && state.fighters.some(f => f && (f.type === 'gojo' || (f._def && f._def.id === 'gojo')) && f.domainActive);

  projectiles.forEach((p) => {
    // Skip off-screen projectiles for performance
    if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
      return;
    }

    // Hide enemy projectiles inside Gojo's domain (except Sukuna's domain/shrine slashes)
    const isSukunaSlash = p.visual === 'sukunaSlash' || p.visual === 'sukunaCleave' || p.visual === 'sukunaDismantleGrid' || p.visual === 'ghostBlade' || p.isSukunaSlash || p.isSukunaDomainSlash;
    const ownerFighter = (typeof p.owner === 'number' && state.fighters) ? state.fighters[p.owner] : p.owner;
    const isOwnerGojo = ownerFighter && (ownerFighter.characterId === 'gojo' || ownerFighter.type === 'gojo');
    if (isGojoDomainActive && ownerFighter && !isOwnerGojo && !isSukunaSlash) {
      return;
    }

    // Black hole visuals are now drawn in drawBlackHoleEffects() which is called BEFORE fighters
    if (p.isBlackHole) {
      return;
    }

    updateEntityVisualScale(p);
    const scale = p.visualScale !== undefined ? p.visualScale : 1.0;
    const hasScale = scale !== 1.0 && scale > 0;

    if (hasScale) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(scale, scale);
      ctx.translate(-p.x, -p.y);
    }

    _drawSingleProjectile(ctx, p, now, isGojoDomainActive);

    if (hasScale) {
      ctx.restore();
    }
  });
}

function _drawSingleProjectile(ctx, p, now, isGojoDomainActive) {
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

    // ── Layla Cosmic Blast: check BEFORE generic isExplosion so the correct draw fn is always used ──
    if (p.visual === 'layla_cosmic_blast') {
      ctx.save();
      ctx.translate(p.x, p.y);
      drawLaylaCosmicBlast(ctx, p);
      ctx.restore();
      return;
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

    // Uryu Ishida Heilig Pfeil (Sacred Spirit Arrow) visual
    if (p.visual === 'heiligPfeil' || p.isHeiligPfeil) {
      drawHeiligPfeil(ctx, p);
      return;
    }

    // Sukuna slash visual
    if (p.visual === 'sukunaSlash') {
      drawSukunaSlash(ctx, p);
      return;
    }

    // Getsuga Tensho visual
    if (p.visual === 'getsuga') {
      drawGetsugaSlash(ctx, p, false);
      return;
    }

    // Black Getsuga Tensho visual
    if (p.visual === 'blackGetsuga') {
      drawGetsugaSlash(ctx, p, true);
      return;
    }

    // Cero Beam visual
    if (p.visual === 'ceroBeam') {
      drawCeroBeam(ctx, p);
      return;
    }

    // Ghost Blade visual
    if (p.visual === 'ghostBlade') {
      drawGhostBlade(ctx, p);
      return;
    }

    // Sukuna Cleave visual
    if (p.visual === 'sukunaCleave') {
      drawSukunaCleave(ctx, p);
      return;
    }

    // Sukuna Furnace Arrow
    if (p.visual === 'sukunaFurnaceArrow' || p.isSukunaFurnace) {
      if (typeof state !== 'undefined' && state.pixiApp) return;
      drawSukunaFurnaceArrow(ctx, p);
      return;
    }

    // Uryu Ishida Heilig Pfeil Sacred Arrow
    if (p.visual === 'heiligPfeil' || p.isHeiligPfeil || p.type === 'heilig_pfeil') {
      drawHeiligPfeil(ctx, p);
      return;
    }

    // John Wick bullet visual - sleek tactical bullet
    if (p.visual === 'johnWickBullet') {
      drawJohnWickBullet(ctx, p);
      return;
    }

    // John Wick shotgun pellet visual - heavy 12-gauge buckshot
    if (p.visual === 'johnWickShotgunPellet') {
      drawJohnWickShotgunPellet(ctx, p);
      return;
    }

    // John Wick rifle bullet visual - supersonic 5.56 green-tip
    if (p.visual === 'johnWickRifleBullet') {
      drawJohnWickRifleBullet(ctx, p);
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

    // Unified Tactical Force Bullet Projectile (Dynamic Character Theme Colored)
    if (p.visual === 'tacticalBullet') {
      drawTacticalBullet(ctx, p);
      return;
    }

    // Layla Steampunk Cannon - Streamlined Cyan Laser Bolt (Compressed Plasma & Wind Drill)
    if (p.visual === 'layla_basic_bullet') {
      // Rendered on Canvas 2D (top layer over PixiJS WebGL)
      ctx.save();
      ctx.globalAlpha = (p.fadingAlpha !== undefined) ? p.fadingAlpha : 1.0;
      ctx.translate(p.x, p.y);
      drawLaylaBasicBullet(ctx, p);
      ctx.restore();
      return;
    }

    // Layla Steampunk Cannon - Ultimate Plasma Bolt (Massive Compressed Plasma & Wind Drill)
    if (p.visual === 'layla_ultimate_bullet') {
      // Rendered on Canvas 2D (top layer over PixiJS WebGL)
      ctx.save();
      ctx.globalAlpha = (p.fadingAlpha !== undefined) ? p.fadingAlpha : 1.0;
      ctx.translate(p.x, p.y);
      drawLaylaUltimateBullet(ctx, p);
      ctx.restore();
      return;
    }

    // Layla Steampunk Cannon - Compressed Sky-Blue Energy Missile (Malefic Bomb)
    if (p.visual === 'layla_bomb') {
      // Rendered on Canvas 2D (top layer over PixiJS WebGL)
      ctx.save();
      ctx.globalAlpha = (p.fadingAlpha !== undefined) ? p.fadingAlpha : 1.0;
      ctx.translate(p.x, p.y);
      drawLaylaBomb(ctx, p);
      ctx.restore();
      return;
    }

    // Layla Steampunk Cannon - Void Projectile (Skill 2)
    if (p.visual === 'layla_void_projectile') {
      // Rendered on Canvas 2D (top layer over PixiJS WebGL)
      ctx.save();
      ctx.globalAlpha = (p.fadingAlpha !== undefined) ? p.fadingAlpha : 1.0;
      ctx.translate(p.x, p.y);
      drawLaylaVoidProjectile(ctx, p);
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

    // --- Yuta's Cursed Speech Soundwave ("DON'T MOVE!") ---
    if (p.visual === 'cursedSpeechWave') {
      ctx.save();
      ctx.translate(p.x, p.y);
      const P = 2.4; // Pixel art grid scale
      const lifeProg = 1 - (p.life / p.maxLife); // 0 to 1
      const currentR = p.r + lifeProg * (p.maxR - p.r);
      const alpha = Math.max(0, (p.life / p.maxLife));

      ctx.globalAlpha = alpha;
      const steps = Math.max(20, Math.round((Math.PI * 2 * currentR) / (P * 2)));

      // 1. Concentric Stepped Pixel Shockwave Rings
      for (let i = 0; i <= steps; i++) {
        const ang = (i / steps) * Math.PI * 2;
        const rx = Math.cos(ang);
        const ry = Math.sin(ang);

        // Dark Outline Ring
        const outR = currentR + P;
        ctx.fillStyle = '#111114';
        ctx.fillRect(Math.round(rx * outR / P) * P - P * 0.5, Math.round(ry * outR / P) * P - P * 0.5, P * 2, P * 2);

        // Neon Cursed Pink Acoustic Ring
        ctx.fillStyle = '#FF1493';
        ctx.fillRect(Math.round(rx * currentR / P) * P, Math.round(ry * currentR / P) * P, P, P);

        // Inner White Soundwave Ring
        if (currentR > 20) {
          const inR = currentR - P * 2;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(Math.round(rx * inR / P) * P, Math.round(ry * inR / P) * P, P, P);
        }
      }

      // 2. Radiating Pixel Audio Frequency / Equalizer Bars
      const numBars = 12;
      for (let b = 0; b < numBars; b++) {
        const bAng = (b / numBars) * Math.PI * 2 + (lifeProg * 0.4);
        const barLen = P * (4 + ((b * 7 + p.life * 3) % 6));
        const bCos = Math.cos(bAng);
        const bSin = Math.sin(bAng);

        for (let s = 0; s < barLen; s += P) {
          const dist = currentR - barLen + s;
          if (dist < 5) continue;
          const bx = Math.round((bCos * dist) / P) * P;
          const by = Math.round((bSin * dist) / P) * P;
          ctx.fillStyle = (s >= barLen - P * 2) ? '#FFFFFF' : '#FF1493';
          ctx.fillRect(bx, by, P, P);
        }
      }

      // 3. Floating Cursed Talisman Pixel Glyphs
      const numGlyphs = 6;
      for (let g = 0; g < numGlyphs; g++) {
        const gAng = (g / numGlyphs) * Math.PI * 2 + (g * 1.5);
        const gDist = currentR * 0.75;
        const gx = Math.round((Math.cos(gAng) * gDist) / P) * P;
        const gy = Math.round((Math.sin(gAng) * gDist) / P) * P;
        ctx.fillStyle = '#111114';
        ctx.fillRect(gx - P, gy - P, P * 3, P * 3);
        ctx.fillStyle = (g % 2 === 0) ? '#FFFFFF' : '#FF1493';
        ctx.fillRect(gx, gy, P, P);
      }

      ctx.restore();
      return;
    }

    // --- Yuta's Pure Love Beam (Pixel Art Mega-Beam) ---
    if (p.visual === 'yuta_pure_love_beam') {
      const ownerFighter = (typeof state !== 'undefined' && state.fighters && p.owner !== undefined) ? state.fighters[p.owner] : null;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      
      const length = p.length || 2500;
      const radius = p.r || 170;
      const P = 4.0; // Pixel art unit grid scale for mega energy beam
      
      let beamAlpha = 0.85;
      let sizeScale = 1.0;
      if (p.life < 30) {
        beamAlpha = Math.max(0, (p.life / 30) * 0.85);
        sizeScale = Math.max(0, p.life / 30);
      }
      
      const frameStep20 = Math.floor(Date.now() / 50);
      const pseudoRand = (seed) => {
        const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
        return x - Math.floor(x);
      };

      const throb = Math.sin(frameStep20 * 0.4) * 16;
      const currentRadius = (radius + throb) * sizeScale;
      
      const startBaseR = currentRadius * 0.25;
      const endBaseR = currentRadius * 2.7;
      const colStep = P * 2; // 8px per pixel beam column

      // ── 1. STEPPED PIXEL-ART BEAM ENERGY BODY ──
      ctx.globalAlpha = beamAlpha;
      for (let x = 0; x <= length; x += colStep) {
        const prog = x / length;
        const currentR = startBaseR + (endBaseR - startBaseR) * Math.pow(prog, 0.95);
        const px = Math.round(x / P) * P;
        const pw = P * 2;

        // A. Outer Pitch-Black Manga Ink Shell
        const outH = Math.round((currentR + P * 2) / P) * P;
        ctx.fillStyle = '#111114';
        ctx.fillRect(px, -outH, pw, outH * 2);

        // B. Abyssal Violet Energy Band
        const vioH = Math.round(currentR / P) * P;
        ctx.fillStyle = '#3A004C';
        ctx.fillRect(px, -vioH, pw, vioH * 2);

        // C. Hot Magenta Band
        const magH = Math.round((currentR * 0.8) / P) * P;
        ctx.fillStyle = '#C7007A';
        ctx.fillRect(px, -magH, pw, magH * 2);

        // D. Neon Cursed Pink Core
        const pnkH = Math.round((currentR * 0.52) / P) * P;
        ctx.fillStyle = '#FF1493';
        ctx.fillRect(px, -pnkH, pw, pnkH * 2);

        // E. Pure White-Hot Center Spine
        const whtH = Math.round((currentR * 0.22) / P) * P;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px, -whtH, pw, Math.max(P, whtH * 2));

        // Stepped Pixel Energy Shockwave Bands along the beam
        const bandPhase = ((x - (Date.now() * 0.45)) % 140 + 140) % 140;
        if (bandPhase < colStep * 2) {
          const ringH = Math.round((currentR * 1.15) / P) * P;
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(px, -ringH, pw, P);
          ctx.fillRect(px, ringH - P, pw, P);
          ctx.fillStyle = 'rgba(255, 20, 147, 0.8)';
          ctx.fillRect(px, -ringH - P, pw, P);
          ctx.fillRect(px, ringH, pw, P);
        }
      }

      // ── 2. STEPPED PIXEL LIGHTNING CRACKLES & JAGGED ELECTRIC BOLTS ──
      const numLightning = 6;
      for (let i = 0; i < numLightning; i++) {
        const side = (i % 2 === 0 ? -1 : 1);
        const ratio = 0.85 + (i % 3) * 0.25;
        const seed = frameStep20 * 37 + i * 53;
        ctx.fillStyle = (pseudoRand(seed) > 0.4) ? '#FFFFFF' : '#FF1493';

        const steps = 18;
        const stepLen = length / steps;
        for (let s = 0; s < steps; s++) {
          const prog = s / steps;
          const currentSpreadY = side * (startBaseR + (endBaseR - startBaseR) * prog) * ratio;
          const jag = (pseudoRand(seed + s * 17) - 0.5) * (20 + prog * 30);
          const lx = Math.round((s * stepLen) / P) * P;
          const ly = Math.round((currentSpreadY + jag) / P) * P;
          ctx.fillRect(lx, ly, P * 1.5, P * 1.5);
        }
      }

      // ── 3. FLOATING DISPERSING PIXEL ENERGY EMBERS ──
      const numEmbers = 24;
      for (let i = 0; i < numEmbers; i++) {
        const pSpeed = 22 + (i % 5) * 8;
        const travel = ((Date.now() * 0.001 * pSpeed * 60 + i * 85) % length);
        const prog = travel / length;
        const beamW = (startBaseR + (endBaseR - startBaseR) * prog);
        const side = (i % 2 === 0 ? -1 : 1);
        const offset = side * (beamW * (0.3 + (i % 7) * 0.12));
        const ex = Math.round(travel / P) * P;
        const ey = Math.round(offset / P) * P;
        const emberSize = (i % 3 === 0) ? P * 2 : P;
        ctx.fillStyle = (i % 3 === 0) ? '#FFFFFF' : ((i % 3 === 1) ? '#FF1493' : '#FF69B4');
        ctx.fillRect(ex, ey, emberSize, emberSize);
      }

      // Re-draw owner Yuta & Rika so beam energy layers cleanly
      if (ownerFighter) {
        ctx.restore(); // Restore back to world space
        ctx.save();
        if (ownerFighter.rika && ownerFighter.rika.active && typeof ownerFighter.rika.draw === 'function') {
          ownerFighter.rika.draw(ctx);
        }
        if (typeof ownerFighter.draw === 'function') {
          ownerFighter.draw(ctx);
        }
        ctx.restore();
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
      }

      // ── 4. PIXEL-ART ORIGIN MUZZLE FLARE (Stepped Pixel Diamond Blast at Hand) ──
      ctx.globalAlpha = 0.90 * beamAlpha;
      const flareR = Math.round((startBaseR * 2.2) / P) * P;
      const flareSteps = Math.ceil(flareR / P);
      for (let gy = -flareSteps; gy <= flareSteps; gy++) {
        for (let gx = -flareSteps; gx <= flareSteps; gx++) {
          const manhattan = Math.abs(gx * P) + Math.abs(gy * P);
          if (manhattan <= flareR) {
            const fx = Math.round(gx * P / P) * P;
            const fy = Math.round(gy * P / P) * P;
            let col = '#FFFFFF';
            if (manhattan > flareR * 0.7) col = '#111114';
            else if (manhattan > flareR * 0.45) col = '#FF1493';
            else if (manhattan > flareR * 0.25) col = '#FF69B4';
            ctx.fillStyle = col;
            ctx.fillRect(fx, fy, P, P);
          }
        }
      }

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

    if (p.visual === 'genosFireball') {
      drawGenosFireball(ctx, p);
      return;
    }

    if (p.visual === 'cjUziBullet') {
      drawCjUziBullet(ctx, p);
      return;
    }

    if (p.visual === 'cjMinigunBullet') {
      drawCjMinigunBullet(ctx, p);
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
  progress = 1,
  rotateAngle = null,
  indicator = false,
}) {
  if (alpha <= 0) return;

  // Optional summon indicator ring
  if (indicator && p.indicatorTimer > 0) {
    const ip = p.indicatorTimer / (p.indicatorLife || 1);
    const ringProgress = 1 - ip;
    const ringRadius = outerDiskR * (1.1 + ringProgress * 0.8);
    ctx.save();
    ctx.globalAlpha = Math.max(0, ip * 0.95) * alpha;

    ctx.beginPath();
    ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(186, 85, 211, ${0.9 * ip})`;
    ctx.lineWidth = Math.max(2, outerDiskR * 0.05) * (0.6 + ringProgress * 1.2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, p.y);

  let diskRot = rotateAngle;
  if (diskRot === null || diskRot === undefined) {
    diskRot = Math.sin(now / 2200) * 0.12;
  }
  ctx.rotate(diskRot);

  // Swirling Accretion Rings (orbital spinning energy arcs)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ringCount = 12;
  for (let i = 0; i < ringCount; i++) {
    const orbitSpeed = (i % 2 === 0 ? 1 : -1) * (450 + i * 110);
    const orbitAngle = now / orbitSpeed + (i * Math.PI * 2) / ringCount;
    
    // Radii for 3D perspective swirling rings
    const radX = eventHorizon * 1.35 + (outerDiskR * 0.90) * (i / ringCount);
    const radY = eventHorizon * 1.05 + (outerDiskR * 0.35) * (i / ringCount);
    const arcLen = Math.PI * 0.9 + 0.3 * Math.sin(now / 200 + i);

    ctx.beginPath();
    ctx.ellipse(0, 0, radX, radY, 0, orbitAngle, orbitAngle + arcLen);
    
    const lineAlpha = (0.6 + 0.4 * Math.sin(now / 150 + i)) * alpha;
    ctx.strokeStyle = (i % 3 === 0) 
      ? `rgba(255, 230, 255, ${lineAlpha})` 
      : (i % 2 === 0 ? `rgba(210, 100, 255, ${lineAlpha * 0.9})` : `rgba(160, 40, 255, ${lineAlpha * 0.8})`);
    ctx.lineWidth = Math.max(1.5, outerDiskR * 0.025);
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  ctx.restore();

  // Solid Black Core (Clean Pitch-Black Center)
  ctx.beginPath();
  ctx.arc(0, 0, eventHorizon, 0, Math.PI * 2);
  ctx.fillStyle = '#000000';
  ctx.fill();

  ctx.restore();
}

export function drawGojoPurpleOrb(ctx, p) {
  ctx.save();
  const colorType = p.isGojoPurple ? 'purple' : 'blue';
  const visualTime = p.visualTime || Date.now();
  const is200 = !!p.is200Percent;
  
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

  // === 200% HOLLOW PURPLE ENHANCED VISUALS ===
  if (is200 && p.isGojoPurple) {
    const t = visualTime;
    const orbR = p.r;

    // 1. Massive pulsating outer void distortion field
    const pulse = 1.0 + Math.sin(t * 0.008) * 0.12;
    ctx.fillStyle = 'rgba(80, 0, 160, 0.12)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, orbR * 5.5 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // 2. Expanding/contracting energy rings (2 rings counter-rotating)
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 2; i++) {
      const ringR = orbR * (2.8 + i * 1.2) * (1.0 + Math.sin(t * 0.006 + i * Math.PI) * 0.08);
      const rotDir = i === 0 ? 1 : -1;
      ctx.save();
      ctx.rotate((t * 0.003 * rotDir) + i * 1.2);
      ctx.strokeStyle = `rgba(200, 100, 255, ${0.35 - i * 0.1})`;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 1.4);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 180, 255, ${0.25 - i * 0.08})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, ringR * 0.92, Math.PI * 0.3, Math.PI * 1.7);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // 3. Electric purple lightning arcs (6 bolts radiating from orb center)
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    const boltCount = 6;
    for (let i = 0; i < boltCount; i++) {
      const seed = i * 7919.3;
      const baseAngle = (Math.PI * 2 / boltCount) * i + t * 0.002;
      const boltLen = orbR * (1.8 + Math.sin(t * 0.01 + seed) * 0.6);
      
      ctx.strokeStyle = `rgba(220, 160, 255, ${0.5 + Math.sin(t * 0.015 + seed) * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      
      // Jagged 3-segment lightning path
      let bx = 0, by = 0;
      for (let s = 0; s < 3; s++) {
        const segLen = boltLen / 3;
        const jitter = (Math.sin(t * 0.02 + seed + s * 5) * 8) * (s === 1 ? 1 : 0.5);
        bx += Math.cos(baseAngle + jitter * 0.05) * segLen;
        by += Math.sin(baseAngle + jitter * 0.05) * segLen;
        ctx.lineTo(bx + Math.sin(t * 0.03 + seed + s) * jitter, by + Math.cos(t * 0.03 + seed + s) * jitter);
      }
      ctx.stroke();
    }
    ctx.restore();

    // 4. Bright white-purple inner glow bloom
    const bloomGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, orbR * 2.2);
    bloomGrad.addColorStop(0, 'rgba(255, 220, 255, 0.45)');
    bloomGrad.addColorStop(0.4, 'rgba(180, 80, 255, 0.25)');
    bloomGrad.addColorStop(1, 'rgba(120, 0, 200, 0)');
    ctx.fillStyle = bloomGrad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, orbR * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Draw the main orb (standard or 200% scaled) with dynamic flight rotation
  const drawR = is200 ? p.r * 1.35 : p.r;
  const spinSpeed = p.isGojoPurple ? 0.016 : 0.024;
  const spinAngle = visualTime * spinSpeed;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(spinAngle);
  drawGojoOrb(ctx, 0, 0, drawR, visualTime, colorType, 0);

  // 200%: Extra white-hot core overlay for empowered feel
  if (is200 && p.isGojoPurple) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, drawR * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.restore();
}

export function drawLaylaBomb(ctx, p) {
  let angle = 0;
  if (p.vx === 0 && p.vy === 0) {
    if (p._resumeVx !== undefined && p._resumeVy !== undefined) {
      angle = Math.atan2(p._resumeVy, p._resumeVx);
    } else if (p.lastAngle !== undefined) {
      angle = p.lastAngle;
    } else {
      angle = p.angle || 0;
    }
  } else {
    angle = Math.atan2(p.vy, p.vx);
    p.lastAngle = angle;
  }
  ctx.rotate(angle);
  
  const now = Date.now();
  const radius = p.r || 12;

  // 1. Enhanced, pulsating outer aura (Cyan, identical theme to basic attack but larger)
  const pulse = 1.0 + Math.sin(now * 0.015) * 0.15;
  ctx.fillStyle = 'rgba(0, 229, 255, 0.25)'; 
  ctx.beginPath();
  ctx.arc(0, 0, radius * 2.2 * pulse, 0, Math.PI * 2); 
  ctx.fill();

  // 2. Stronger, thicker cyan plasma tails
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3AB4F2';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-5, 5); ctx.lineTo(-80, 0);
  ctx.moveTo(-5, -5); ctx.lineTo(-70, 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,229,255,0.5)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-5, 0); ctx.lineTo(-60, 0);
  ctx.stroke();

  // 3. Thick Core: solid cyan teardrop (Identical shape to basic attack but scaled up)
  ctx.fillStyle = '#00E5FF';
  ctx.beginPath();
  ctx.moveTo(25, 0);
  ctx.bezierCurveTo(12, -9, -6, -10, -20, -4);
  ctx.lineTo(-24, 0);
  ctx.lineTo(-20, 4);
  ctx.bezierCurveTo(-6, 10, 12, 9, 25, 0);
  ctx.closePath();
  ctx.fill();
  
  // 4. White inner core for high-energy density
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.bezierCurveTo(8, -4, 0, -5, -12, -2);
  ctx.lineTo(-14, 0);
  ctx.lineTo(-12, 2);
  ctx.bezierCurveTo(0, 5, 8, 4, 18, 0);
  ctx.closePath();
  ctx.fill();

  // 5. Enhanced Supersonic Energy Shockwaves (expanding curved arcs)
  ctx.lineCap = 'round';
  const bombWavePositions = [15, 5, -5, -15];
  bombWavePositions.forEach((offset, idx) => {
    const scaleFactor = 1.0 + idx * 0.15;
    const rad = 10 * scaleFactor;
    
    // Outer glow
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(offset, 0, rad, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    // Inner core
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(offset, 0, rad, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
  });

  // 6. White center streak
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(22, 0); ctx.lineTo(-12, 0);
  ctx.stroke();
}

export function drawLaylaCosmicBlast(ctx, p) {
  const progress = 1 - (p.life / (p.maxLife || 35));
  const fade = Math.sin((1 - progress) * (Math.PI / 2));
  const maxR = p.r || 75;
  const currentR = maxR * (0.35 + progress * 0.65);
  
  ctx.globalAlpha = fade;

  const isVoid = p.isVoid || false;
  const cMain = isVoid ? '186, 85, 211' : '0, 229, 255';
  const cGlow = isVoid ? '216, 191, 216' : '224, 255, 255';
  const cSolid = isVoid ? '#00E5FF' : '#00E5FF';
  const cWhiteGlow = isVoid ? '238, 130, 238' : '224, 255, 255';

  // 1. Soft glowing background radial expansion
  ctx.fillStyle = `rgba(${cMain}, 0.12)`;
  ctx.beginPath();
  ctx.arc(0, 0, currentR * 1.15, 0, Math.PI * 2);
  ctx.fill();
  
  // 2. High-energy plasma blast boundary gradient
  const waveGrad = ctx.createRadialGradient(0, 0, currentR * 0.4, 0, 0, currentR);
  waveGrad.addColorStop(0, `rgba(${cMain}, 0)`);
  waveGrad.addColorStop(0.7, `rgba(${cMain}, 0.6)`);
  waveGrad.addColorStop(0.92, cSolid);
  waveGrad.addColorStop(1, `rgba(${cGlow}, 0)`);
  
  ctx.fillStyle = waveGrad;
  ctx.beginPath();
  ctx.arc(0, 0, currentR, 0, Math.PI * 2);
  ctx.fill();
  
  // 3. Sharp white expansion ring
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3.0 * (1 - progress);
  ctx.beginPath();
  ctx.arc(0, 0, currentR * 0.95, 0, Math.PI * 2);
  ctx.stroke();

  // 4. Tech/Targeting containment ring: Segmented arcs (Replaces the star)
  ctx.save();
  ctx.rotate(progress * Math.PI * 0.5); // rotates slowly as it expands
  ctx.strokeStyle = `rgba(${cMain}, 0.8)`;
  ctx.lineWidth = 2.0;
  
  const segments = 4;
  const gap = Math.PI * 0.15;
  const segArc = (Math.PI * 2) / segments - gap;
  const techR = currentR * 0.6;
  
  for (let i = 0; i < segments; i++) {
    const startAngle = i * (Math.PI * 2 / segments);
    ctx.beginPath();
    ctx.arc(0, 0, techR, startAngle, startAngle + segArc);
    ctx.stroke();
    
    // Add small tick marks at the end of each segment
    const tickX = Math.cos(startAngle) * techR;
    const tickY = Math.sin(startAngle) * techR;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(tickX, tickY, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 5. Plasma static discharges (lightning sparks shooting out from the core)
  ctx.save();
  ctx.rotate(-progress * Math.PI * 0.3);
  ctx.strokeStyle = `rgba(${cMain}, 0.9)`;
  ctx.lineWidth = 1.5 * (1 - progress);
  const dischargeCount = 6;
  for (let i = 0; i < dischargeCount; i++) {
    const angle = (i * Math.PI * 2) / dischargeCount;
    const startD = currentR * 0.2;
    const endD = currentR * 0.85;
    
    // Draw a jagged line for spark
    const midD = (startD + endD) * 0.5;
    const jitter = (Math.random() - 0.5) * currentR * 0.15;
    
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * startD, Math.sin(angle) * startD);
    ctx.lineTo(Math.cos(angle + 0.1) * midD + jitter, Math.sin(angle + 0.1) * midD + jitter);
    ctx.lineTo(Math.cos(angle) * endD, Math.sin(angle) * endD);
    ctx.stroke();
  }
  ctx.restore();

  // 6. Expanding tech energy shards (replaced simple triangle shards with rotating diamonds)
  const shardCount = 8;
  ctx.fillStyle = isVoid ? '#E8D3FF' : '#E0FFFF';
  for (let i = 0; i < shardCount; i++) {
    const shardAngle = (i * Math.PI * 2) / shardCount + progress * 2.0;
    const dist = maxR * progress * (0.45 + (i % 2) * 0.45);
    const sx = Math.cos(shardAngle) * dist;
    const sy = Math.sin(shardAngle) * dist;
    const size = Math.max(0.5, (4.0 - progress * 3.5) * ((i % 2) + 1));
    
    // Draw diamond/square shards
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(shardAngle + progress * 3);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export function drawLaylaUltimateBullet(ctx, p) {
  let angle = 0;
  if (p.vx === 0 && p.vy === 0) {
    if (p._resumeVx !== undefined && p._resumeVy !== undefined) {
      angle = Math.atan2(p._resumeVy, p._resumeVx);
    } else if (p.lastAngle !== undefined) {
      angle = p.lastAngle;
    } else {
      angle = p.angle || 0;
    }
  } else {
    angle = Math.atan2(p.vy, p.vx);
    p.lastAngle = angle;
  }
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

  // 4. Supersonic energy shockwaves (forward-curving arcs with soft glow)
  ctx.lineCap = 'round';
  const wavePositions = [12, 0, -12];
  wavePositions.forEach((offset) => {
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(offset, 0, 11, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(offset, 0, 11, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
  });

  // 5. White center beam
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 0); ctx.lineTo(-14, 0);
  ctx.stroke();
}

export function drawLaylaBasicBullet(ctx, p) {
  let angle = 0;
  if (p.vx === 0 && p.vy === 0) {
    if (p._resumeVx !== undefined && p._resumeVy !== undefined) {
      angle = Math.atan2(p._resumeVy, p._resumeVx);
    } else if (p.lastAngle !== undefined) {
      angle = p.lastAngle;
    } else {
      angle = p.angle || 0;
    }
  } else {
    angle = Math.atan2(p.vy, p.vx);
    p.lastAngle = angle;
  }
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

  // 4. Supersonic energy shockwaves (forward-curving arcs with soft glow)
  ctx.lineCap = 'round';
  const basicWavePositions = [8, -2];
  basicWavePositions.forEach((offset) => {
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.3)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(offset, 0, 7, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(offset, 0, 7, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
  });

  // 5. White center streak
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(15, 0); ctx.lineTo(-8, 0);
  ctx.stroke();
}

export function drawLaylaVoidProjectile(ctx, p) {
  const now = Date.now();
  const radius = p.r || 10;
  const time = now * 0.003;

  // 1. Pulsating outer aura (soft transparent cyan)
  const pulse = 1.0 + Math.sin(now * 0.015) * 0.1;
  const auraGrad = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 2.5 * pulse);
  auraGrad.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
  auraGrad.addColorStop(0.5, 'rgba(0, 150, 255, 0.2)');
  auraGrad.addColorStop(1, 'rgba(0, 150, 255, 0)');
  ctx.fillStyle = auraGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 2.5 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // 2. Swirling void energy trails (concentric fading dust orbs behind it)
  if (p.history && p.history.length > 1) {
    ctx.save();
    const trailLimit = Math.min(5, p.history.length);
    for (let i = 1; i < trailLimit; i++) {
      const pt = p.history[p.history.length - 1 - i];
      if (!pt) continue;
      const relX = pt.x - p.x;
      const relY = pt.y - p.y;
      const alpha = (1 - i / trailLimit) * 0.35 * (p.fadingAlpha !== undefined ? p.fadingAlpha : 1.0);
      
      ctx.fillStyle = `rgba(0, 200, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(relX, relY, radius * (1 - i * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Rotating tech containment ring
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.save();
  ctx.rotate(time * 1.5);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2);
  ctx.stroke();
  
  // Crosshairs/Tick marks on the containment ring
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 4; i++) {
    const tickAngle = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.arc(Math.cos(tickAngle) * radius * 1.35, Math.sin(tickAngle) * radius * 1.35, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. Orb sphere body (radial gradient from hot-white center to deep violet edges)
  const sphereGrad = ctx.createRadialGradient(-radius * 0.25, -radius * 0.25, 0, 0, 0, radius);
  sphereGrad.addColorStop(0, '#E0FFFF'); // Light cyan-white hot core
  sphereGrad.addColorStop(0.3, '#00E5FF'); // Cyan blue
  sphereGrad.addColorStop(0.7, '#0088CC'); // Deep blue
  sphereGrad.addColorStop(1, '#004488'); // Dark blue edge outline
  
  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // 5. Electrical static crackles inside/around the sphere
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  for (let i = 0; i < 2; i++) {
    const crackAngle = Math.random() * Math.PI * 2;
    const startX = Math.cos(crackAngle) * radius * 0.4;
    const startY = Math.sin(crackAngle) * radius * 0.4;
    const endX = Math.cos(crackAngle + Math.PI) * radius * 0.9;
    const endY = Math.sin(crackAngle + Math.PI) * radius * 0.9;
    ctx.moveTo(startX, startY);
    ctx.lineTo((startX + endX) * 0.5 + (Math.random() - 0.5) * 4, (startY + endY) * 0.5 + (Math.random() - 0.5) * 4);
    ctx.lineTo(endX, endY);
  }
  ctx.stroke();
}

/**
 * Renders Genos's Incineration Plasma Bolt — high-velocity energy blast with
 * speed trails ripping backward, a jagged broken plasma shell, and a needle-sharp piercing tip.
 */
function drawGenosFireball(ctx, p) {
  const isDarkMode = Boolean(
    typeof state !== 'undefined' && (
      state.arenaTheme === 'dark' || 
      state.darkMode || 
      (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
    )
  );

  const angle = (p.vx !== undefined && p.vy !== undefined && (p.vx !== 0 || p.vy !== 0))
    ? Math.atan2(p.vy, p.vx)
    : (p.angle || 0);

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  // Scaled flaming cannonball radius (~14-17px sphere)
  const R_ball  = Math.max(13, (p.r || 9) * 1.45);
  const tailLen = R_ball * 2.8;
  const flicker = p.life || 0;

  if (isDarkMode) {
    drawGenosPixelFireball(ctx, p, R_ball, tailLen, flicker);
    ctx.restore();
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. TRAILING COMET FIRE PLUME — raging flame plume streaming behind the cannonball
  // ─────────────────────────────────────────────────────────────────────────
  const tailGrad = ctx.createLinearGradient(-tailLen, 0, 0, 0);
  tailGrad.addColorStop(0,   'rgba(255, 60,  0, 0)');
  tailGrad.addColorStop(0.35,'rgba(255, 100, 0, 0.38)');
  tailGrad.addColorStop(0.70,'rgba(255, 170, 0, 0.78)');
  tailGrad.addColorStop(1.0, 'rgba(255, 230, 60, 0.95)');

  ctx.fillStyle = tailGrad;
  ctx.beginPath();
  ctx.moveTo(-tailLen, 0);
  ctx.quadraticCurveTo(-tailLen * 0.45, -R_ball * 1.15, 0, -R_ball * 0.85);
  ctx.lineTo(0, R_ball * 0.85);
  ctx.quadraticCurveTo(-tailLen * 0.45, R_ball * 1.15, -tailLen, 0);
  ctx.closePath();
  ctx.fill();

  // White-hot inner core stream in the trailing plume
  const coreTailGrad = ctx.createLinearGradient(-tailLen * 0.55, 0, 0, 0);
  coreTailGrad.addColorStop(0,   'rgba(255, 255, 255, 0)');
  coreTailGrad.addColorStop(0.5, 'rgba(255, 240, 180, 0.80)');
  coreTailGrad.addColorStop(1,   'rgba(255, 255, 255, 1.0)');
  ctx.strokeStyle = coreTailGrad;
  ctx.lineWidth = R_ball * 0.42;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-tailLen * 0.55, 0);
  ctx.lineTo(0, 0);
  ctx.stroke();

  // ─────────────────────────────────────────────────────────────────────────
  // 2. DANCING SOLAR CORONA FLAME TONGUES — licking around the ball sphere
  // ─────────────────────────────────────────────────────────────────────────
  const tongueCount = 12;
  ctx.fillStyle = 'rgba(255, 90, 0, 0.88)';
  ctx.beginPath();
  for (let i = 0; i <= tongueCount; i++) {
    const ang = (i / tongueCount) * Math.PI * 2;
    const flameAmp = R_ball * (1.0 + 0.32 * Math.sin(ang * 5 + flicker * 0.5) + 0.15 * Math.cos(ang * 8 - flicker * 0.3));
    const px = Math.cos(ang) * flameAmp;
    const py = Math.sin(ang) * flameAmp;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  // ─────────────────────────────────────────────────────────────────────────
  // 3. SPHERICAL INCINERATION CANNONBALL BODY — superheated plasma orb
  // ─────────────────────────────────────────────────────────────────────────
  const ballGrad = ctx.createRadialGradient(R_ball * 0.2, 0, 0, 0, 0, R_ball);
  ballGrad.addColorStop(0,    '#FFFFFF');                 // Superheated fusion core
  ballGrad.addColorStop(0.35, 'rgba(255, 240, 80, 1.0)'); // Solar golden plasma mantle
  ballGrad.addColorStop(0.75, 'rgba(255, 90,  0, 1.0)');  // Saturated fiery orange body
  ballGrad.addColorStop(1.0,  'rgba(180, 20,  0, 0.92)'); // Deep magma crimson rim
  ctx.fillStyle = ballGrad;
  ctx.beginPath();
  ctx.arc(0, 0, R_ball, 0, Math.PI * 2);
  ctx.fill();

  // ─────────────────────────────────────────────────────────────────────────
  // 4. SUPERHEATED WHITE FUSION CENTER
  // ─────────────────────────────────────────────────────────────────────────
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(R_ball * 0.15, 0, R_ball * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // ─────────────────────────────────────────────────────────────────────────
  // 5. FLOATING TRAILING SPARK EMBERS IN WAKE
  // ─────────────────────────────────────────────────────────────────────────
  for (let e = 0; e < 6; e++) {
    const ex = -tailLen * (0.60 + ((e * 0.22 + flicker * 0.05) % 0.70));
    const ey = Math.sin(e * 3.7 + flicker * 0.4) * (R_ball * 0.65);
    const eR = 1.6 + (e % 3) * 0.8;
    ctx.fillStyle = (e % 2 === 0) ? '#FFE600' : '#FF5500';
    ctx.beginPath();
    ctx.arc(ex, ey, eR, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Authentic 2D discrete grid-scan pixel art rasterizer for Genos's Flaming Cannonball (Dark Mode).
 * Uses the Saitama skin / Getsuga Tensho rasterization standard (P = 2.0px, Rule #35 compliant).
 */
function drawGenosPixelFireball(ctx, p, R_ball, tailLen, flicker) {
  ctx.imageSmoothingEnabled = false;
  const P = 2.0;
  const snap = (v) => Math.round(v / P) * P;

  // 1. Inside flaming cannonball sphere + dancing corona flame tongues
  const isInsideOrb = (gx, gy) => {
    const dist = Math.hypot(gx, gy);
    const ang = Math.atan2(gy, gx);
    const flameR = R_ball * (1.0 + 0.30 * Math.sin(ang * 5 + flicker * 0.5) + 0.15 * Math.cos(ang * 8 - flicker * 0.3));
    return dist <= flameR;
  };

  // 2. Inside trailing comet flame plume
  const isInsideTail = (gx, gy) => {
    if (gx > 0 || gx < -tailLen) return false;
    const t = -gx / tailLen; // 0 at center, 1 at tail tip
    const plumeW = R_ball * Math.pow(1.0 - t, 1.25) * (1.0 + 0.25 * Math.sin(t * 8 + flicker));
    return Math.abs(gy) <= plumeW;
  };

  // 3. Inside detached floating ember sparks
  const emberSparks = [
    { x: -tailLen * 0.85, y: -R_ball * 0.45, r: P * 1.2 },
    { x: -tailLen * 1.15, y:  R_ball * 0.35, r: P * 1.2 },
    { x: -tailLen * 1.35, y: -R_ball * 0.20, r: P * 1.2 },
    { x: -tailLen * 0.70, y:  R_ball * 0.55, r: P * 1.2 },
  ];
  const isInsideEmbers = (gx, gy) => {
    for (const em of emberSparks) {
      if (Math.hypot(gx - em.x, gy - em.y) <= em.r) return true;
    }
    return false;
  };

  const isInsideFireball = (gx, gy) => {
    return isInsideOrb(gx, gy) || isInsideTail(gx, gy) || isInsideEmbers(gx, gy);
  };

  const minX = Math.floor((-tailLen * 1.45) / P) * P;
  const maxX = Math.ceil((R_ball * 1.5) / P) * P;
  const maxY = Math.ceil((R_ball * 1.5) / P) * P;

  // ── Main Discrete 2D Cannonball Grid with 4-Neighbor Border Shell ──
  for (let gy = -maxY; gy <= maxY; gy += P) {
    for (let gx = minX; gx <= maxX; gx += P) {
      if (!isInsideFireball(gx, gy)) continue;

      const px = snap(gx);
      const py = snap(gy);

      const isBorder = !isInsideFireball(gx + P, gy) ||
                       !isInsideFireball(gx - P, gy) ||
                       !isInsideFireball(gx, gy + P) ||
                       !isInsideFireball(gx, gy - P);

      if (isBorder) {
        ctx.fillStyle = '#150500'; // Dark manga obsidian flame border
        ctx.fillRect(px, py, P, P);
        continue;
      }

      const dist = Math.hypot(gx, gy);

      // 4-tier stepped shading hierarchy:
      if (dist < R_ball * 0.38 || (gx <= 0 && gx > -tailLen * 0.45 && Math.abs(gy) < P * 1.2)) {
        ctx.fillStyle = '#FFFFFF'; // Superheated pure white fusion core
      } else if (dist < R_ball * 0.72 || (gx <= 0 && Math.abs(gy) < R_ball * 0.35)) {
        ctx.fillStyle = '#FFE600'; // Solar golden plasma
      } else if (dist <= R_ball || (gx <= 0 && Math.abs(gy) < R_ball * 0.75)) {
        ctx.fillStyle = '#FF5500'; // Saturated fiery orange body
      } else {
        ctx.fillStyle = ((Math.round(gx / P) + Math.round(gy / P)) % 2 === 0) ? '#FF5500' : '#CC2A00'; // Magma crimson corona tongues
      }
      ctx.fillRect(px, py, P, P);
    }
  }
}

/**
 * Renders Uryu Ishida's Heilig Pfeil (Sacred Spirit Arrow) in flight.
 * High-velocity crystalline arrow with radiant Reishi trail and diamond head.
 */
function drawHeiligPfeil(ctx, p) {
  // Always lock and preserve the arrow's flight trajectory angle; never snap to 0 on wall collision or deceleration!
  if (p.vx !== 0 || p.vy !== 0) {
    p.lastAngle = Math.atan2(p.vy, p.vx);
  }
  const angle = (p.lastAngle !== undefined)
    ? p.lastAngle
    : (p.angle !== undefined ? p.angle : (Math.atan2(p.vy || 0, p.vx || 0) || 0));

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(angle);

  const speed = Math.hypot(p.vx || 0, p.vy || 0) || 24;
  const scale = p.scale || 0.140;
  const arrowImg = (typeof _getUryuArrowImage === 'function') ? _getUryuArrowImage() : null;
  const arrowLen = 521 * scale; // ~73px
  const halfLen = arrowLen / 2; // ~36.5px
  const trailLen = Math.min(110, speed * 3.5);

  // 1. Radiant Cyan Speed Streak Trail streaming behind the nock
  const trailGrad = ctx.createLinearGradient(-halfLen - trailLen, 0, -halfLen, 0);
  trailGrad.addColorStop(0, 'rgba(0, 229, 255, 0)');
  trailGrad.addColorStop(0.5, 'rgba(0, 229, 255, 0.35)');
  trailGrad.addColorStop(1, 'rgba(0, 229, 255, 0.85)');

  ctx.fillStyle = trailGrad;
  ctx.beginPath();
  ctx.moveTo(-halfLen - trailLen, 0);
  ctx.lineTo(-halfLen, -4.5);
  ctx.lineTo(-halfLen, 4.5);
  ctx.closePath();
  ctx.fill();

  // White-hot core beam trail
  const coreTrailGrad = ctx.createLinearGradient(-halfLen - trailLen * 0.7, 0, -halfLen, 0);
  coreTrailGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  coreTrailGrad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');
  ctx.strokeStyle = coreTrailGrad;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-halfLen - trailLen * 0.7, 0);
  ctx.lineTo(-halfLen, 0);
  ctx.stroke();

  // 2. Draw Exact Pixel-Art Sacred Arrow (ISHIDA-ARROW.png) Centered at (p.x, p.y)
  if (arrowImg && arrowImg.complete && arrowImg.naturalWidth > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.scale(scale, scale);
    // Center the 521px wide texture so (0, 0) is the center of the arrow
    ctx.drawImage(arrowImg, -260, -33);
    ctx.restore();
  } else {
    // High-fidelity vector fallback
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-halfLen, 0);
    ctx.lineTo(halfLen, 0);
    ctx.stroke();
  }

  // 3. Piercing Light / Energy Aura
  ctx.strokeStyle = p.isPiercing ? 'rgba(0, 229, 255, 0.90)' : 'rgba(0, 229, 255, 0.60)';
  ctx.lineWidth = p.isPiercing ? 3.8 : 2.4;
  ctx.beginPath();
  ctx.moveTo(-halfLen * 0.6, 0);
  ctx.lineTo(halfLen + 4, 0);
  ctx.stroke();

  // 4. 4-Way Cruciform Star Glint at the Arrowhead Tip (+halfLen, 0)
  const flareSize = p.isPiercing ? 14 : 9;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(halfLen - flareSize * 0.4, 0);
  ctx.lineTo(halfLen + flareSize, 0);
  ctx.moveTo(halfLen, -flareSize * 0.5);
  ctx.lineTo(halfLen, flareSize * 0.5);
  ctx.stroke();

  if (p.isPiercing) {
    const diagSize = flareSize * 0.45;
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.95)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(halfLen - diagSize, -diagSize);
    ctx.lineTo(halfLen + diagSize, diagSize);
    ctx.moveTo(halfLen - diagSize, diagSize);
    ctx.lineTo(halfLen + diagSize, -diagSize);
    ctx.stroke();
  }

  // 5. Sacred Spirit Spark Fletching at Nock (-halfLen, 0)
  ctx.fillStyle = '#00E5FF';
  ctx.beginPath();
  ctx.arc(-halfLen, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-halfLen, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

