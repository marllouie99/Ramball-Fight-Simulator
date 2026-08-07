import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { drawDopplegangerBodyEffect, drawDopplegangerPurpleSword } from '../weapons/dopplegangerWeaponGraphics.js';
import { drawDoppelgangerSkin } from '../fighters/doppelgangerSkin.js';
import { drawSketchyCircle } from './fighterRenderer.js';

let _sortedFightersBuffer = [];

export function updateEntityVisualScale(entity, speed = 0.12) {
  if (!entity) return;
  if (entity.visualScale === undefined) entity.visualScale = 1.0;
  if (entity.visualScaleTarget === undefined) entity.visualScaleTarget = 1.0;

  if (Math.abs(entity.visualScale - entity.visualScaleTarget) > 0.005) {
    entity.visualScale += (entity.visualScaleTarget - entity.visualScale) * speed;
  } else {
    entity.visualScale = entity.visualScaleTarget;
  }
  entity.visualScaleTarget = 1.0;
}

export function drawFighters() {
  const { ctx, fighters, mode } = state;
  // Removed debug overlay hiding to prevent DOM layout thrashing

  // Helper to render team indicator ring for team modes (2v2 and 1v2 Stand Off)
  const isTeamMode = (mode === '2v2' || mode === '1v2 Stand Off' || mode === '1v2');

  const drawTeamRing = (fighter, fi, isOnTop = false) => {
    if (!isTeamMode || !fighter || fighter.hp <= 0) return;
    const team = state.getFighterTeam(fi);
    if (team === null) return;

    // In 1v2 mode, remove team indicator for the solo fighter (team 0)
    const is1v2Mode = (mode === '1v2 Stand Off' || mode === '1v2' || state.mode === '1v2 Stand Off' || state.mode === '1v2');
    if (is1v2Mode && team === 0) return;

    const teamColor = team === 0 ? '#ff4d4d' : '#4da3ff';

    const drawX = fighter.x;
    const drawY = fighter.y - (fighter.z || 0);

    ctx.save();
    ctx.translate(drawX, drawY);

    if (!isOnTop) {
      // Underfoot ground indicator (filled)
      ctx.beginPath();
      ctx.arc(0, 0, fighter.r + 8, 0, Math.PI * 2);
      ctx.fillStyle = teamColor;
      ctx.globalAlpha = 1.0;
      ctx.fill();
      
      // Crisp outline
      ctx.strokeStyle = '#000'; // Black outline for contrast
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1.0;
      ctx.stroke();

      // Draw team silhouette/glow
      ctx.beginPath();
      ctx.arc(0, 0, fighter.r + 4, 0, Math.PI * 2);
      ctx.fillStyle = teamColor;
      ctx.globalAlpha = 0.2;
      ctx.fill();
    } else {
      // Over-aura crisp team indicator ring overlay so Cursed Energy aura & domain effects never obscure team identity!
      ctx.beginPath();
      ctx.arc(0, 0, fighter.r + 9, 0, Math.PI * 2);
      ctx.strokeStyle = teamColor;
      ctx.lineWidth = 3.5;
      ctx.globalAlpha = 1.0;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, fighter.r + 11, 0, Math.PI * 2);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.8;
      ctx.stroke();
    }

    ctx.restore();
  };

  // Genos Ultimate Screen Dimming (drawn BEFORE fighters so Genos & opponents are never dimmed)
  const genosUltFighter = fighters ? fighters.find(f => f && (f.characterId === 'genos' || f.type === 'genos') && (f.isChargingUlt || f.isFiringUlt || f.isUltRecovering)) : null;
  if (genosUltFighter) {
    let dimAlpha = 0;
    if (genosUltFighter.isChargingUlt) {
      const windupTotal = CONFIG.genos?.ultWindupFrames || 60;
      const elapsed = windupTotal - (genosUltFighter.ultTimer || 0);
      dimAlpha = 0.65 * Math.min(1.0, elapsed / 30); // Smooth 0.5s fade-in while channeling
    } else if (genosUltFighter.isFiringUlt) {
      dimAlpha = 0.65;
    } else if (genosUltFighter.isUltRecovering) {
      dimAlpha = 0.65 * Math.min(1.0, (genosUltFighter.ultRecoveryTimer || 0) / 30); // Smooth fade-out on recovery
    }

    if (dimAlpha > 0.005) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);

      // Incineration thermal heat radial gradient centered on Genos (matching his beam's #FF5500 plasma color)
      const gX = genosUltFighter.x;
      const gY = genosUltFighter.y;
      const maxDist = Math.max(ctx.canvas.width, ctx.canvas.height) * 1.2;
      const heatGrad = ctx.createRadialGradient(gX, gY, 10, gX, gY, maxDist);

      heatGrad.addColorStop(0,    `rgba(160, 35,  0, ${(dimAlpha * 0.45).toFixed(3)})`);
      heatGrad.addColorStop(0.35, `rgba(75,  15,  0, ${(dimAlpha * 0.70).toFixed(3)})`);
      heatGrad.addColorStop(0.70, `rgba(25,   5,  0, ${(dimAlpha * 0.88).toFixed(3)})`);
      heatGrad.addColorStop(1.0,  `rgba(0,    0,  0, ${(dimAlpha * 0.95).toFixed(3)})`);

      ctx.fillStyle = heatGrad;
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();

      // Ambient Beam Light Spill on surrounding environment (only active when the beam is actively firing!)
      if (genosUltFighter.isFiringUlt) {
        const beamAngle = (genosUltFighter.gunAngle !== undefined) ? genosUltFighter.gunAngle : (genosUltFighter.ultAngle || genosUltFighter.angle || 0);
        const beamW = CONFIG.genos?.ultBeamWidth || 70;
        const range = CONFIG.genos?.ultBeamRange || 1200;
        const startOffset = genosUltFighter.r + 5;
        const startX = genosUltFighter.x + Math.cos(beamAngle) * startOffset;
        const startY = genosUltFighter.y + Math.sin(beamAngle) * startOffset;
        const endX = startX + Math.cos(beamAngle) * range;
        const endY = startY + Math.sin(beamAngle) * range;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const lightMult = genosUltFighter.isFiringUlt ? 1.0 : (genosUltFighter.isChargingUlt ? 0.45 : 0.15);

        // 1. Wide outer ambient fill — source-over so it actually PAINTS warm light on the dark bg
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = `rgba(210, 70, 0, ${(0.45 * lightMult).toFixed(3)})`;
        ctx.lineWidth = beamW * 2.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // 2. Mid warm gold layer — source-over for visible warm colour
        ctx.strokeStyle = `rgba(255, 140, 10, ${(0.50 * lightMult).toFixed(3)})`;
        ctx.lineWidth = beamW * 1.6;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // 3. Bright inner core — lighter blending adds luminance on top of the painted base
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255, 220, 100, ${(0.60 * lightMult).toFixed(3)})`;
        ctx.lineWidth = beamW * 0.7;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // 4. Radial muzzle origin bloom — source-over base then lighter pop
        ctx.globalCompositeOperation = 'source-over';
        const bloomR = beamW * 2.0;
        const originGlow = ctx.createRadialGradient(startX, startY, 2, startX, startY, bloomR);
        originGlow.addColorStop(0,    `rgba(255, 240, 180, ${(0.80 * lightMult).toFixed(3)})`);
        originGlow.addColorStop(0.35, `rgba(255, 130, 0,   ${(0.55 * lightMult).toFixed(3)})`);
        originGlow.addColorStop(0.70, `rgba(180, 50,  0,   ${(0.25 * lightMult).toFixed(3)})`);
        originGlow.addColorStop(1,    'rgba(0, 0, 0, 0)');
        ctx.fillStyle = originGlow;
        ctx.beginPath();
        ctx.arc(startX, startY, bloomR, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }
  }

  // Sort fighters by depth (y-coordinate) so characters lower on screen draw on top.
  // Exception: Fighters with an active domain expansion are forced to draw last (on top of everyone).
  if (!_sortedFightersBuffer || _sortedFightersBuffer.length !== fighters.length) {
    _sortedFightersBuffer = new Array(fighters.length);
    for (let i = 0; i < fighters.length; i++) _sortedFightersBuffer[i] = { f: null, i: 0 };
  }
  for (let i = 0; i < fighters.length; i++) {
    const f = fighters[i];
    _sortedFightersBuffer[i].f = f;
    _sortedFightersBuffer[i].i = i;


  }
  
  // Sort the actual WebGL layer by Y for correct Z-indexing against other WebGL elements
  state.pixiLayers.fighters.sortChildren();

  _sortedFightersBuffer.sort((a, b) => {
    if (!a.f) return -1;
    if (!b.f) return 1;

    // Force active domain expansions to the top layer
    const aDomain = a.f.domainActive;
    const bDomain = b.f.domainActive;
    if (aDomain && !bDomain) return 1;
    if (!aDomain && bDomain) return -1;

    // Force active punchers/attackers/skill casters to render on top of their targets so punching hands & skill effects overlay opponent bodies
    const aPunching = (a.f.punchAnimTimer && a.f.punchAnimTimer > 0) || (a.f.isChannelingPurple) || (a.f.redEffectTimer && a.f.redEffectTimer > 0);
    const bPunching = (b.f.punchAnimTimer && b.f.punchAnimTimer > 0) || (b.f.isChannelingPurple) || (b.f.redEffectTimer && b.f.redEffectTimer > 0);
    if (aPunching && !bPunching) return 1;
    if (!aPunching && bPunching) return -1;

    return a.f.y - b.f.y;
  });

  _sortedFightersBuffer.forEach((item) => {
    const fighter = item.f;
    const fi = item.i;
    if (!fighter || fighter.hp <= 0) return;

    updateEntityVisualScale(fighter);

    const scale = fighter.visualScale !== undefined ? fighter.visualScale : 1.0;
    const hasScale = scale !== 1.0 && scale > 0;

    if (hasScale) {
      ctx.save();
      ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
      ctx.scale(scale, scale);
      ctx.translate(-fighter.x, -(fighter.y - (fighter.z || 0)));
    }

    // Draw underfoot team indicator ring base
    drawTeamRing(fighter, fi, false);

    const opponent = mode === 'FFA' ? null : fighters[1 - fi];
    try {
      fighter.draw(ctx, opponent);
    } catch (e) {
      console.error('fighter.draw error:', e);
    }

    // Draw crisp team indicator overlay ring AFTER fighter & CE aura draw, so CE aura never hides team indicator
    drawTeamRing(fighter, fi, true);

    if (hasScale) {
      ctx.restore();
    }
  });

  // Draw time-stop visual effect (Cronos passive/sphere effect or Gojo Infinity freeze)
  const allStasisEntities = [
    ...(fighters || []),
    ...(state.illusions || [])
  ];

  allStasisEntities.forEach((entity) => {
    if (!entity || entity.hp <= 0) return;
    
    // Suppress stasis overlays entirely when target is being ambushed by Toji
    if (entity.isTargetOfAmbush) return;
    
    let isInfinityFreeze = entity.isFrozenByInfinity && (entity.timeStopTimer || 0) > 0;
    const isMahoragaFreeze = entity.mahoragaAdaptationFreezeTimer > 0;
    // Suppress golden visual for short hit-pauses (< 15 frames) used in flurries like Sukuna's
    const isGenericTimeStop = entity.timeStopTimer > 0 && (entity._timeStopOriginalDuration || 0) >= 15;

    // Check if Gojo's Domain Expansion (Unlimited Void) is currently active and freezing everyone
    let gojoDomainActive = false;
    if (typeof state !== 'undefined' && state.fighters) {
      const gojo = state.fighters.find(f => f && (f.characterId === 'gojo' || f.type === 'gojo') && f.domainActive);
      if (gojo) gojoDomainActive = true;
    }

    // Unlimited Void freeze & Hollow Purple hit: do not apply blue fill/ring overlay to enemies when hit by Purple or inside Gojo's domain
    if (gojoDomainActive || entity.isCaughtInPurple || (entity.purpleHitTimer && entity.purpleHitTimer > 0)) return;

    const isFrozen = isInfinityFreeze || isGenericTimeStop;
    if (!isFrozen) return;

    // If Mahoraga paused time for adaptation (and it's not Gojo's infinity), don't draw an overlay
    if (isMahoragaFreeze && !isInfinityFreeze) return;

    const isCronosFreeze = entity.frozenByCronos || entity.isCronosStasis;
    const isCyanOverlay = !isCronosFreeze; // Cyan blue for Gojo / Limitless / stasis freeze, Gold ONLY for Cronos
    const colorFill = isCyanOverlay ? 'rgba(0, 229, 255, 0.65)' : 'rgba(255, 215, 0, 0.35)'; // Cyan for Gojo / Infinity, Gold for Cronos
    const colorRing = isCyanOverlay ? 'rgba(224, 255, 255, 0.9)' : 'rgba(255, 255, 150, 0.8)';

    ctx.save();
    ctx.translate(entity.x, entity.y - (entity.z || 0));

    const time = Date.now() / 200;
    const pulse = Math.sin(time * 2) * 0.5 + 0.5;

    // 1. Body fill overlay
    ctx.beginPath();
    ctx.arc(0, 0, entity.r + 3, 0, Math.PI * 2);
    ctx.fillStyle = colorFill;
    ctx.fill();

    // 2. Outer glowing stasis ring
    ctx.beginPath();
    ctx.arc(0, 0, entity.r + 4 + pulse * 4, 0, Math.PI * 2);
    ctx.strokeStyle = colorRing;
    ctx.lineWidth = 3.0;
    ctx.stroke();

    // Floating stasis particles / tick marks (like a clock)
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((Math.PI * 2 * i) / 4 + time * 0.5);
      ctx.beginPath();
      ctx.moveTo(0, -entity.r - 6);
      ctx.lineTo(0, -entity.r - 14);
      ctx.strokeStyle = '#00F3FF';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  });

  fighters.forEach((fighter) => {
    if (!fighter || fighter.hp <= 0 || typeof fighter._drawAttackSlashEffects !== 'function') return;
    try {
      fighter._drawAttackSlashEffects(ctx);
    } catch (e) {
      console.error('fighter slash effect draw error:', e);
    }
  });

  // Draw beam overlays (LaserFighter / Trickster laser beams) on top of fighters
  fighters.forEach((fighter) => {
    if (!fighter || fighter.hp <= 0 || typeof fighter.drawBeamOverlay !== 'function') return;
    try {
      fighter.drawBeamOverlay(ctx);
    } catch (e) {
      console.error('fighter beam overlay draw error:', e);
    }
  });

  fighters.forEach((fighter, fi) => {
    if (!fighter || fighter.hp <= 0) return;
    // Ensure backstab mark is rendered even if a subclass didn't call super.draw()
    if (fighter.backstabMarkTimer && fighter.backstabMarkTimer > 0) {
      const progress = fighter.backstabMarkTimer / (CONFIG.darkslategray.backstabMarkDuration || 45);
      const offset = fighter.r + 10;
      const bx = fighter.x - Math.cos(fighter.angle) * offset;
      const by = (fighter.y - (fighter.z || 0)) - Math.sin(fighter.angle) * offset;

      ctx.save();
      ctx.globalAlpha = Math.min(1, progress * 1.2);
      ctx.fillStyle = '#ff44ff';
      ctx.beginPath();
      ctx.arc(bx, by, 6 + (1 - progress) * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(bx, by);
      ctx.rotate(fighter.angle + Math.PI);
      ctx.fillStyle = 'rgba(255,68,255,0.9)';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // decrement timer so it fades
      fighter.backstabMarkTimer = Math.max(0, fighter.backstabMarkTimer - 1);
    }
  });
}

export function drawIllusions() {
  const { ctx, illusions } = state;

  for (const illusion of illusions) {
    if (!illusion || illusion.hp <= 0) continue;
    // Skip Rika - she is injected into the illusions array for AI targeting, but draws herself!
    if (illusion.isRika) continue;

    updateEntityVisualScale(illusion);
    const scale = illusion.visualScale !== undefined ? illusion.visualScale : 1.0;
    const hasScale = scale !== 1.0 && scale > 0;

    ctx.save();
    ctx.globalAlpha = 0.85;

    // Draw illusion body
    ctx.translate(illusion.x, illusion.y);
    if (hasScale) {
      ctx.scale(scale, scale);
    }
    ctx.rotate(illusion.angle || 0);

    // Purple ethereal glow
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(155, 89, 182, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, illusion.r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    const animTime = illusion.animationTime || Date.now();

    // Draw the haze and void core UNDER the body
    drawDopplegangerBodyEffect(ctx, 0, 0, illusion.r, 0, 'under', animTime);

    // Custom body skin
    drawDoppelgangerSkin(ctx, 0, 0, illusion.r, 0, animTime);

    // Draw the swirling violet smoke OVER the body
    drawDopplegangerBodyEffect(ctx, 0, 0, illusion.r, 0, 'over', animTime);

    // Draw status overlays (shock, poison, burn)
    if (typeof illusion.drawStatusOverlays === 'function') {
      illusion.drawStatusOverlays(ctx, illusion.r);
    }

    // Global hit flash visual effect
    if (illusion.hitFlashTimer > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(0, 0, illusion.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${illusion.hitFlashTimer / 8})`;
      ctx.fill();
      ctx.restore();
    }

    // Draw illusion outline (optional if you still want an outline over the custom skin)
    let seed = 0;
    const idStr = String(illusion.id || 'illusion');
    for (let i = 0; i < idStr.length; i++) {
      seed += idStr.charCodeAt(i);
    }
    drawSketchyCircle(ctx, 0, 0, illusion.r, seed, '#111', 2.5);

    // Draw illusion health
    ctx.rotate(-illusion.angle);
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const hpText = Math.floor(illusion.hp).toString();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeText(hpText, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(hpText, 0, 0);

    ctx.restore();

    // Draw illusion sword (always visible, not just during swings)
    drawDopplegangerPurpleSword(
      ctx,
      illusion.x, illusion.y,
      illusion.gunAngle || illusion.swordSwingAngle || 0,
      illusion.r,
      illusion.swordSwingActive,
      illusion.swordSwingTimer,
      illusion.swordSwingAngle,
      illusion.swordSwingDuration,
      animTime
    );
  }
}
