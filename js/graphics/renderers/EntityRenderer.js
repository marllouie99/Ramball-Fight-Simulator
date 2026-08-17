import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { drawDopplegangerBodyEffect, drawDopplegangerPurpleSword } from '../weapons/dopplegangerWeaponGraphics.js';
import { drawDoppelgangerSkin } from '../fighters/doppelgangerSkin.js';
import { drawSketchyCircle } from './fighterRenderer.js';
import { drawSoulDisfigurementEffect, drawSoulDisfigurementCounter, drawEmbeddedMahitoSpikes, drawMahitoFleshBubblyDeformLocal, drawMinionHealthBar } from '../statusEffects.js';
import { drawMahitoSkin } from '../fighters/mahitoSkin.js';

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
    if (!isTeamMode || !fighter || fighter.hp <= 0 || (fighter.vanishTimer && fighter.vanishTimer > 0)) return;
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
    const isAttacking = (f) => Boolean(
      (f.punchAnimTimer && f.punchAnimTimer > 0) ||
      (f.slashSwingTimer && f.slashSwingTimer > 0) ||
      (f.twinScissorAnimTimer && f.twinScissorAnimTimer > 0) ||
      (f.fleshSurgeAnimTimer && f.fleshSurgeAnimTimer > 0) ||
      (f.maceCannonAnimTimer && f.maceCannonAnimTimer > 0) ||
      (f.isChannelingPurple) ||
      (f.redEffectTimer && f.redEffectTimer > 0) ||
      (f.lapisBlueAnimTimer && f.lapisBlueAnimTimer > 0) ||
      (f.cleaveCutTimer && f.cleaveCutTimer > 0) ||
      (f.fugaTimer && f.fugaTimer > 0)
    );
    const aPunching = isAttacking(a.f);
    const bPunching = isAttacking(b.f);
    if (aPunching && !bPunching) return 1;
    if (!aPunching && bPunching) return -1;

    return a.f.y - b.f.y;
  });

  _sortedFightersBuffer.forEach((item) => {
    const fighter = item.f;
    const fi = item.i;
    if (!fighter || fighter.hp <= 0 || (fighter.vanishTimer && fighter.vanishTimer > 0)) return;

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

    // Shivering animation when paralyzed by Mahito (rapid soul reshaping vibration)
    const isParalyzedByMahito = Boolean(fighter.isParalyzedByMahito || (fighter.paralyzeTimer && fighter.paralyzeTimer > 0 && fighter.isParalyzedByMahito));
    let shiverX = 0, shiverY = 0;
    if (isParalyzedByMahito) {
      const remainingProgress = Math.min(1.0, (fighter.paralyzeTimer || 45) / 45);
      const tremorAmt = 2.0 + remainingProgress * 2.2;
      shiverX = (Math.random() - 0.5) * tremorAmt;
      shiverY = (Math.random() - 0.5) * tremorAmt;
    }

    if (shiverX !== 0 || shiverY !== 0) {
      ctx.save();
      ctx.translate(shiverX, shiverY);
    }

    const opponent = mode === 'FFA' ? null : fighters[1 - fi];
    try {
      fighter.draw(ctx, opponent);
      
      // If Mahoraga is adapting (wheel clicking), dim the opponent so only Mahoraga is highlighted
      const activeMaho = fighters.find(f => f && f.hp > 0 && (f.type === 'mahoraga' || (f._def && f._def.type === 'mahoraga')) && (f.wheelClickTimer > 0 || f.adaptationPauseTimer > 0));
      if (activeMaho && fighter !== activeMaho) {
        const timer = (activeMaho.adaptationPauseTimer && activeMaho.adaptationPauseTimer > 0) ? activeMaho.adaptationPauseTimer : activeMaho.wheelClickTimer;
        const clickMax = activeMaho.adaptationPauseMax || activeMaho.wheelClickMax || 25;
        const progress = Math.min(1.0, Math.max(0.0, (clickMax - timer) / clickMax));
        const maxDimAlpha = 0.75; 
        const dimAlpha = Math.sin(progress * Math.PI) * maxDimAlpha;

        if (dimAlpha > 0.01) {
          ctx.save();
          ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
          ctx.fillStyle = `rgba(0, 0, 0, ${dimAlpha.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(0, 0, fighter.r + 20, 0, Math.PI * 2); // cover body and hands
          ctx.fill();
          ctx.restore();
        }
      }
    } catch (e) {
      console.error('fighter.draw error:', e);
    }

    if (shiverX !== 0 || shiverY !== 0) {
      ctx.restore();
    }

    // Draw crisp team indicator overlay ring AFTER fighter & CE aura draw, so CE aura never hides team indicator
    drawTeamRing(fighter, fi, true);

    // Embedded Mahito Bone Spikes attached to body
    if (fighter._embeddedMahitoSpikes && fighter._embeddedMahitoSpikes.length > 0) {
      ctx.save();
      ctx.translate(fighter.x, fighter.y - (fighter.z || 0));
      drawEmbeddedMahitoSpikes(ctx, fighter.r, fighter);
      ctx.restore();
    }

    // Floating Mahito Soul Disfigurement Stack Counter Badge (At top of body)
    if ((fighter._soulDisfigurementStacks || 0) > 0 && (fighter._soulDisfigurementTimer || 0) > 0) {
      drawSoulDisfigurementCounter(ctx, fighter.x, fighter.y - (fighter.z || 0), fighter.r, fighter._soulDisfigurementStacks, fighter._soulDisfigurementTimer);
    }

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
    if (typeof state !== 'undefined') {
      if (state.domainActive || state.activeDomain) gojoDomainActive = true;
      if (!gojoDomainActive && state.fighters) {
        gojoDomainActive = state.fighters.some(f => f && f.domainActive);
      }
    }

    // Unlimited Void freeze, Hollow Purple hit, Pure Love Beam, & Wall Pin: do not apply blue fill/ring overlay
    const isPureLoveBeamTrapped = entity.caughtInPureLoveBeam || (entity.pureLoveBeamTimer && entity.pureLoveBeamTimer > 0) || (entity.pureLoveBeamRecoveryTimer && entity.pureLoveBeamRecoveryTimer > 0);
    if (gojoDomainActive || entity.isCaughtInPurple || (entity.purpleHitTimer && entity.purpleHitTimer > 0) || isPureLoveBeamTrapped || entity.suppressFreezeOverlay || entity.isWallPinned) return;

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

  const isGojoDomainActive = state.fighters && state.fighters.some(f => f && (f.type === 'gojo' || (f._def && f._def.id === 'gojo')) && f.domainActive);

  fighters.forEach((fighter) => {
    if (!fighter || fighter.hp <= 0 || typeof fighter._drawAttackSlashEffects !== 'function') return;
    if (isGojoDomainActive && fighter.characterId !== 'gojo') return; // Hide enemy slash effects in Gojo's domain
    try {
      fighter._drawAttackSlashEffects(ctx);
    } catch (e) {
      console.error('fighter slash effect draw error:', e);
    }
  });

  // Draw beam overlays (LaserFighter / Trickster laser beams) on top of fighters
  fighters.forEach((fighter) => {
    if (!fighter || fighter.hp <= 0 || typeof fighter.drawBeamOverlay !== 'function') return;
    if (isGojoDomainActive && fighter.characterId !== 'gojo') return; // Hide enemy beam overlays in Gojo's domain
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

let _patchworkBallCache = null;

function getPatchworkBallCanvas(r, variant = 0, progress = 0) {
  // Quantize progress to ~20 discrete steps to prevent infinite cache explosion
  const qProgress = Math.round(progress * 20) / 20;
  
  const baseSize = Math.ceil(r * 2) + 20; // Extra padding for horns/tendrils/protrusions
  // Allow extra padding for swelling bubbles when dying
  const size = qProgress > 0 ? Math.ceil(baseSize * 1.5) : baseSize;

  if (!_patchworkBallCache) {
    _patchworkBallCache = new Map();
  }
  const cacheKey = `${size}_${variant}_${qProgress.toFixed(2)}`;
  if (_patchworkBallCache.has(cacheKey)) {
    return _patchworkBallCache.get(cacheKey);
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  const center = size / 2;
  ctx.translate(center, center);

  if (qProgress > 0) {
    // 1. Draw swelling cursed energy bubbles protruding from sides (pre-explosion)
    ctx.save();
    const bubbleColor = variant === 1 ? 'rgba(80, 120, 180, ' + (0.5 + qProgress * 0.4) + ')' : 
                        variant === 2 ? 'rgba(160, 50, 50, ' + (0.5 + qProgress * 0.4) + ')' :
                                        'rgba(120, 40, 180, ' + (0.5 + qProgress * 0.4) + ')';
    ctx.fillStyle = bubbleColor;
    ctx.strokeStyle = '#0A0610';
    ctx.lineWidth = 1.5;

    // Left bubble
    const b1Radius = r * 0.7 * qProgress;
    const b1X = -r * 0.8;
    const b1Y = r * 0.3;
    if (b1Radius > 2) {
      ctx.beginPath();
      ctx.arc(b1X, b1Y, b1Radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Inner cursed glow
      ctx.fillStyle = variant === 1 ? 'rgba(160, 200, 255, ' + (0.3 + qProgress * 0.3) + ')' :
                      variant === 2 ? 'rgba(255, 120, 120, ' + (0.3 + qProgress * 0.3) + ')' :
                                      'rgba(200, 100, 255, ' + (0.3 + qProgress * 0.3) + ')';
      ctx.beginPath();
      ctx.arc(b1X - b1Radius * 0.2, b1Y - b1Radius * 0.2, b1Radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // Right bubble
    ctx.fillStyle = bubbleColor;
    const b2Radius = r * 0.8 * qProgress;
    const b2X = r * 0.7;
    const b2Y = r * 0.2;
    if (b2Radius > 2) {
      ctx.beginPath();
      ctx.arc(b2X, b2Y, b2Radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = variant === 1 ? 'rgba(160, 200, 255, ' + (0.3 + qProgress * 0.3) + ')' :
                      variant === 2 ? 'rgba(255, 120, 120, ' + (0.3 + qProgress * 0.3) + ')' :
                                      'rgba(200, 100, 255, ' + (0.3 + qProgress * 0.3) + ')';
      ctx.beginPath();
      ctx.arc(b2X - b2Radius * 0.2, b2Y - b2Radius * 0.2, b2Radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    // Top bubble
    ctx.fillStyle = bubbleColor;
    const b3Radius = r * 0.5 * qProgress;
    const b3X = -r * 0.5;
    const b3Y = -r * 0.7;
    if (b3Radius > 2) {
      ctx.beginPath();
      ctx.arc(b3X, b3Y, b3Radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = variant === 1 ? 'rgba(160, 200, 255, ' + (0.3 + qProgress * 0.3) + ')' :
                      variant === 2 ? 'rgba(255, 120, 120, ' + (0.3 + qProgress * 0.3) + ')' :
                                      'rgba(200, 100, 255, ' + (0.3 + qProgress * 0.3) + ')';
      ctx.beginPath();
      ctx.arc(b3X - b3Radius * 0.2, b3Y - b3Radius * 0.2, b3Radius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  
  // 2. Draw the main cursed spirit body (with dying intensification)
  drawCursedSpiritBody(ctx, r, qProgress, variant); // progress determines face distortion

  // 3. Overlay intensifying cursed energy glow as it's about to explode
  if (qProgress > 0.3) {
    const glowAlpha = (qProgress - 0.3) * 0.6;
    const glowGrad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 1.15);
    const colorStart = variant === 1 ? 'rgba(160, 200, 255, ' + (glowAlpha * 0.65) + ')' :
                       variant === 2 ? 'rgba(255, 120, 120, ' + (glowAlpha * 0.65) + ')' :
                                       'rgba(220, 100, 255, ' + (glowAlpha * 0.65) + ')';
    const colorMid = variant === 1 ? 'rgba(70, 130, 200, ' + (glowAlpha * 0.3) + ')' :
                     variant === 2 ? 'rgba(200, 50, 50, ' + (glowAlpha * 0.3) + ')' :
                                     'rgba(140, 30, 200, ' + (glowAlpha * 0.3) + ')';
    glowGrad.addColorStop(0, colorStart);
    glowGrad.addColorStop(0.6, colorMid);
    glowGrad.addColorStop(1, 'rgba(140, 30, 200, 0.0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
    ctx.fill();
  }

  _patchworkBallCache.set(cacheKey, canvas);
  return canvas;
}

/**
 * Draws a grotesque cursed spirit body — the redesigned Mahito transfigured human minion.
 * Supports multiple design variants:
 * - Variant 0: Brown skull-like head emerging from green spiky collar lined with teeth, stubby arms, hollow black eyes.
 * - Variant 1: Pale blue-grey deformed skin with one giant central void eye, small crying eyes, horizontal teeth mouth, wriggling dark tendrils.
 * - Variant 2: Split-face pinkish-red skull divided by stitch sutures, one hollow eye, one stitched eye, rock base with white spikes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} r - body radius
 * @param {number} progress - 0 = alive, 0->1 = dying/about to explode
 * @param {number} variant - variant index (0, 1, or 2)
 */
function drawCursedSpiritBody(ctx, r, progress, variant = 0) {
  ctx.save();

  const colorVoid = '#0E0B11';     // Gaping black voids

  if (variant === 0) {
    const colorSkin = '#B27A60';     // Fleshy tan/brown skin
    const colorGreen = '#3B6E4C';    // Deep green outer collar
    const colorTeeth = '#F5F5F0';    // Sharp bone white teeth

    // 1. Green collar/sleeve base (deformed organic spiky shape with wavy folds)
    ctx.fillStyle = colorGreen;
    ctx.strokeStyle = '#0E0B11';
    ctx.lineWidth = 1.8;
    
    ctx.beginPath();
    const numCollarPoints = 16;
    const collarPoints = [];
    for (let i = 0; i < numCollarPoints; i++) {
      const angle = (i / numCollarPoints) * Math.PI * 2;
      const baseR = r * 1.08;
      const wave = r * 0.08 * Math.sin(angle * 5) + r * 0.05 * Math.cos(angle * 3);
      const dist = baseR + wave;
      const px = Math.cos(angle) * dist;
      const py = r * 0.22 + Math.sin(angle) * dist;
      collarPoints.push({ x: px, y: py });
    }
    
    ctx.moveTo(collarPoints[0].x, collarPoints[0].y);
    for (let i = 0; i < numCollarPoints; i++) {
      const p1 = collarPoints[i];
      const p2 = collarPoints[(i + 1) % numCollarPoints];
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. White teeth/spikes lining the green sleeve pointing inwards/upwards
    ctx.fillStyle = colorTeeth;
    const numSleeveTeeth = 12;
    for (let i = 0; i < numSleeveTeeth; i++) {
      const angle = Math.PI * 0.05 + (i / (numSleeveTeeth - 1)) * Math.PI * 1.9;
      ctx.save();
      ctx.rotate(angle);
      const waveOffset = r * 0.08 * Math.sin(angle * 5) + r * 0.05 * Math.cos(angle * 3);
      ctx.translate(r * 0.98 + waveOffset, 0);
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.12);
      ctx.lineTo(-r * 0.28, 0); // pointing inward
      ctx.lineTo(0, r * 0.12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 3. Stubby outstretched arms on the sides
    ctx.fillStyle = colorSkin;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.2);
    ctx.quadraticCurveTo(-r * 0.9, r * 0.1, -r * 1.25, r * 0.3); // upper edge
    ctx.lineTo(-r * 1.2, r * 0.45); // hand tip
    ctx.quadraticCurveTo(-r * 0.8, r * 0.35, -r * 0.5, r * 0.45); // lower edge
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(-r * 1.25, r * 0.35, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(r * 0.5, r * 0.2);
    ctx.quadraticCurveTo(r * 0.9, r * 0.1, r * 1.25, r * 0.3); // upper edge
    ctx.lineTo(r * 1.2, r * 0.45); // hand tip
    ctx.quadraticCurveTo(r * 0.8, r * 0.35, r * 0.5, r * 0.45); // lower edge
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(r * 1.25, r * 0.35, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. Main fleshy head
    ctx.fillStyle = colorSkin;
    ctx.beginPath();
    const numHeadPoints = 12;
    const headPoints = [];
    for (let i = 0; i < numHeadPoints; i++) {
      const angle = (i / numHeadPoints) * Math.PI * 2;
      const rx = r * 0.84;
      const ry = r * 0.94;
      const baseR = Math.sqrt(Math.pow(rx * Math.cos(angle), 2) + Math.pow(ry * Math.sin(angle), 2));
      let bump = 0;
      if (angle > -Math.PI * 0.25 && angle < Math.PI * 0.35) {
        bump = r * 0.07 * Math.sin(angle * 3.5); // cheek/jaw lumps
      } else if (angle > Math.PI * 0.6 && angle < Math.PI * 1.2) {
        bump = -r * 0.06 * Math.cos(angle * 2.0); // forehead dent
      } else {
        bump = r * 0.04 * Math.sin(angle * 4.0);
      }
      const dist = baseR + bump;
      headPoints.push({ x: Math.cos(angle) * dist, y: -r * 0.05 + Math.sin(angle) * dist });
    }
    ctx.moveTo(headPoints[0].x, headPoints[0].y);
    for (let i = 0; i < numHeadPoints; i++) {
      const p1 = headPoints[i];
      const p2 = headPoints[(i + 1) % numHeadPoints];
      ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wrinkles
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.7);
    ctx.quadraticCurveTo(0, -r * 0.75, r * 0.4, -r * 0.7);
    ctx.moveTo(-r * 0.3, -r * 0.6);
    ctx.quadraticCurveTo(0, -r * 0.65, r * 0.3, -r * 0.6);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.15);
    ctx.lineTo(-r * 0.55, r * 0.15);
    ctx.moveTo(r * 0.6, -r * 0.15);
    ctx.lineTo(r * 0.55, r * 0.15);
    ctx.stroke();

    // 5. Hollow eyes
    ctx.fillStyle = colorVoid;
    const leftEyeX = -r * 0.32;
    const leftEyeY = -r * 0.35;
    const rightEyeX = r * 0.32;
    const rightEyeY = -r * 0.35;
    const eyeRad = r * 0.22 + progress * (r * 0.12);

    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, eyeRad, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rightEyeX, rightEyeY, eyeRad, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.22);
    ctx.lineTo(-r * 0.08, -r * 0.14);
    ctx.lineTo(0, -r * 0.10);
    ctx.lineTo(r * 0.08, -r * 0.14);
    ctx.closePath();
    ctx.fill();

    // 6. Gaping mouth void
    const mouthY = r * 0.22;
    const mouthW = r * 0.45;
    const mouthH = r * 0.30 + progress * r * 0.25;

    ctx.fillStyle = colorVoid;
    ctx.beginPath();
    ctx.ellipse(0, mouthY, mouthW, mouthH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ridges
    ctx.strokeStyle = '#0E0B11';
    ctx.lineWidth = 1.6;
    const mouthLinesCount = 9;
    for (let i = 0; i < mouthLinesCount; i++) {
      const t = (i / (mouthLinesCount - 1)) * 2 - 1;
      const mx = t * mouthW * 0.95;
      ctx.beginPath();
      ctx.moveTo(mx, mouthY - mouthH * 0.6);
      ctx.lineTo(mx * 1.15, mouthY - mouthH * 1.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx, mouthY + mouthH * 0.6);
      ctx.lineTo(mx * 1.15, mouthY + mouthH * 1.25);
      ctx.stroke();
    }
  } 
  else if (variant === 1) {
    const colorSkin = '#7E92A2';     // Pale blue-grey skin
    const colorCollar = '#2B233C';   // Dark violet shroud base

    // 1. Shroud base
    ctx.fillStyle = colorCollar;
    ctx.strokeStyle = '#0E0B11';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const numCollarPoints = 14;
    const collarPoints = [];
    for (let i = 0; i < numCollarPoints; i++) {
      const angle = (i / numCollarPoints) * Math.PI * 2;
      const baseR = r * 1.05;
      const wave = r * 0.10 * Math.sin(angle * 6);
      const dist = baseR + wave;
      collarPoints.push({ x: Math.cos(angle) * dist, y: r * 0.25 + Math.sin(angle) * dist });
    }
    ctx.moveTo(collarPoints[0].x, collarPoints[0].y);
    for (let i = 0; i < numCollarPoints; i++) {
      const p1 = collarPoints[i];
      const p2 = collarPoints[(i + 1) % numCollarPoints];
      ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Wriggling tendrils at bottom
    ctx.strokeStyle = '#2B233C';
    ctx.lineWidth = 3.0;
    const tendrilTime = Date.now() * 0.005;
    for (let j = 0; j < 4; j++) {
      const tx = -r * 0.6 + j * r * 0.4;
      ctx.beginPath();
      ctx.moveTo(tx, r * 0.5);
      ctx.quadraticCurveTo(
        tx + Math.sin(tendrilTime + j) * 4, 
        r * 0.9, 
        tx + Math.sin(tendrilTime + j) * 8, 
        r * 1.22
      );
      ctx.stroke();
    }

    // 2. Main deformed skull head (lumpy vertical oval)
    ctx.fillStyle = colorSkin;
    ctx.strokeStyle = '#0E0B11';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const numHeadPoints = 12;
    const headPoints = [];
    for (let i = 0; i < numHeadPoints; i++) {
      const angle = (i / numHeadPoints) * Math.PI * 2;
      const rx = r * 0.80;
      const ry = r * 0.98;
      const baseR = Math.sqrt(Math.pow(rx * Math.cos(angle), 2) + Math.pow(ry * Math.sin(angle), 2));
      let bump = 0;
      if (angle > Math.PI * 0.5 && angle < Math.PI * 1.0) {
        bump = r * 0.12 * Math.sin(angle * 2.0); // forehead bulge
      } else {
        bump = r * 0.05 * Math.cos(angle * 4.0); // surface bumps
      }
      const dist = baseR + bump;
      headPoints.push({ x: Math.cos(angle) * dist, y: -r * 0.05 + Math.sin(angle) * dist });
    }
    ctx.moveTo(headPoints[0].x, headPoints[0].y);
    for (let i = 0; i < numHeadPoints; i++) {
      const p1 = headPoints[i];
      const p2 = headPoints[(i + 1) % numHeadPoints];
      ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Eye sockets
    ctx.fillStyle = colorVoid;
    const mainEyeR = r * 0.28 + progress * r * 0.15;
    ctx.beginPath();
    ctx.arc(0, -r * 0.35, mainEyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Two small crying eyes below
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.1, r * 0.08, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.1, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // 4. Wide horizontal mouth
    const mouthW = r * 0.65;
    const mouthH = r * 0.15 + progress * r * 0.2;
    ctx.fillStyle = colorVoid;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.25, mouthW, mouthH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Messy teeth inside mouth
    ctx.fillStyle = '#E8E4D8';
    const numTeeth = 8;
    for (let i = 0; i < numTeeth; i++) {
      const t = -0.85 + (i / (numTeeth - 1)) * 1.7;
      const tx = t * mouthW;
      ctx.beginPath();
      ctx.arc(tx, r * 0.25 - mouthH * 0.3, 1.8, 0, Math.PI * 2);
      ctx.arc(tx + 2, r * 0.25 + mouthH * 0.3, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  } 
  else if (variant === 2) {
    const colorSkin = '#C26B6B';     // Pinkish red flesh skin
    const colorCollar = '#4A4A4A';   // Dark grey rock base

    // 1. Rock-like collar base
    ctx.fillStyle = colorCollar;
    ctx.strokeStyle = '#0E0B11';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const numCollarPoints = 12;
    const collarPoints = [];
    for (let i = 0; i < numCollarPoints; i++) {
      const angle = (i / numCollarPoints) * Math.PI * 2;
      const baseR = r * 1.1;
      const jag = (i % 2 === 0) ? r * 0.08 : -r * 0.05;
      const dist = baseR + jag;
      collarPoints.push({ x: Math.cos(angle) * dist, y: r * 0.28 + Math.sin(angle) * dist });
    }
    ctx.moveTo(collarPoints[0].x, collarPoints[0].y);
    for (let i = 0; i < numCollarPoints; i++) {
      const p1 = collarPoints[i];
      const p2 = collarPoints[(i + 1) % numCollarPoints];
      ctx.lineTo((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Small horns pointing outwards from the rock collar
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI * 0.2 + i * Math.PI * 0.22;
      ctx.save();
      ctx.rotate(angle);
      ctx.translate(r * 1.05, 0);
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(r * 0.22, 0);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 2. Main split head
    ctx.fillStyle = colorSkin;
    ctx.strokeStyle = '#0E0B11';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const numHeadPoints = 12;
    const headPoints = [];
    for (let i = 0; i < numHeadPoints; i++) {
      const angle = (i / numHeadPoints) * Math.PI * 2;
      const rx = r * 0.88;
      const ry = r * 0.92;
      const baseR = Math.sqrt(Math.pow(rx * Math.cos(angle), 2) + Math.pow(ry * Math.sin(angle), 2));
      let bump = (angle > Math.PI * 0.5) ? r * 0.06 : -r * 0.06;
      const dist = baseR + bump;
      headPoints.push({ x: Math.cos(angle) * dist, y: -r * 0.05 + Math.sin(angle) * dist });
    }
    ctx.moveTo(headPoints[0].x, headPoints[0].y);
    for (let i = 0; i < numHeadPoints; i++) {
      const p1 = headPoints[i];
      const p2 = headPoints[(i + 1) % numHeadPoints];
      ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Vertical suture/split line dividing the head in half
    ctx.strokeStyle = '#0E0B11';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.quadraticCurveTo(r * 0.1, 0, 0, r * 0.8);
    ctx.stroke();

    // Cross stitches along the division line
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const sy = -r * 0.7 + j * r * 0.35;
      const sx = r * 0.1 * Math.sin(j);
      ctx.moveTo(sx - 4, sy - 2);
      ctx.lineTo(sx + 4, sy + 2);
    }
    ctx.stroke();

    // Left side: Large hollow eye socket
    ctx.fillStyle = colorVoid;
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, r * 0.24 + progress * r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Right side: Stitched-closed eye
    ctx.beginPath();
    const ex = r * 0.35;
    const ey = -r * 0.35;
    ctx.moveTo(ex - 6, ey - 4);
    ctx.lineTo(ex + 6, ey + 4);
    ctx.moveTo(ex + 6, ey - 4);
    ctx.lineTo(ex - 6, ey + 4);
    ctx.stroke();

    // Left side: Half gaping screaming mouth
    const mouthW = r * 0.45;
    const mouthH = r * 0.24 + progress * r * 0.2;
    ctx.fillStyle = colorVoid;
    ctx.beginPath();
    ctx.ellipse(-r * 0.22, r * 0.25, mouthW * 0.6, mouthH, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawStitchedPatchworkBall(ctx, illusion) {
  const r = illusion.r || 25;
  const isDying = !!illusion.isDying;
  
  if (illusion.variant === undefined) {
    illusion.variant = Math.floor(Math.random() * 3); // 3 variants (0, 1, 2)
  }
  const variant = illusion.variant;

  let progress = 0;
  if (isDying) {
    progress = 1.0 - (illusion.deathTimer / (illusion.maxDeathTimer || 20));
  }

  const cachedCanvas = getPatchworkBallCanvas(r, variant, progress);
  ctx.drawImage(cachedCanvas, -cachedCanvas.width / 2, -cachedCanvas.height / 2);
}

export function drawIllusions() {
  const { ctx, illusions } = state;

  for (const illusion of illusions) {
    if (!illusion || (illusion.hp <= 0 && !illusion.isDying)) continue;
    // Skip Rika - she is injected into the illusions array for AI targeting, but draws herself!
    if (illusion.isRika) continue;

    updateEntityVisualScale(illusion);
    const scale = illusion.visualScale !== undefined ? illusion.visualScale : 1.0;
    const hasScale = scale !== 1.0 && scale > 0;

    // Shivering animation when paralyzed by Mahito OR when dying (about to explode)
    let shiverX = 0, shiverY = 0;
    if (illusion.isParalyzedByMahito || (illusion.paralyzeTimer && illusion.paralyzeTimer > 0 && illusion.isParalyzedByMahito)) {
      const remainingProgress = Math.min(1.0, (illusion.paralyzeTimer || 45) / 45);
      const tremorAmt = 2.0 + remainingProgress * 2.2;
      shiverX = (Math.random() - 0.5) * tremorAmt;
      shiverY = (Math.random() - 0.5) * tremorAmt;
    } else if (illusion.isDying) {
      // Shiver/tremor intensity increases violently as the pop timer approaches zero!
      const maxTimer = illusion.maxDeathTimer || 20;
      const progress = 1.0 - (illusion.deathTimer / maxTimer);
      const tremorAmt = 1.0 + progress * 5.0; // scales up to 6px shake
      shiverX = (Math.random() - 0.5) * tremorAmt;
      shiverY = (Math.random() - 0.5) * tremorAmt;
    }

    if (illusion.isEvasionMinion) {
      ctx.save();
      ctx.globalAlpha = (illusion.isDying || illusion.isDyingEvasion) ? 1.0 : (illusion.opacity !== undefined ? Math.max(0, Math.min(1.0, illusion.opacity)) : 1.0);
      drawMahitoSkin(ctx, illusion);
      ctx.restore();
      continue;
    }

    if (illusion.isTransfiguredHuman) {
      ctx.save();
      // Draw transfigured human body at location
      ctx.translate(illusion.x + shiverX, illusion.y + shiverY);
      if (hasScale) {
        ctx.scale(scale, scale);
      }
      
      // Deformed transfigured humans roll/rotate continuously over time while moving
      if (illusion._rollRotation === undefined) {
        illusion._rollRotation = 0;
      }
      if (!illusion.isDying && !illusion.timeStopTimer && !illusion.hitStunTimer) {
        const speed = Math.sqrt((illusion.vx || 0) * (illusion.vx || 0) + (illusion.vy || 0) * (illusion.vy || 0)) || 0;
        // Roll speed proportional to their actual movement speed
        illusion._rollRotation += speed * 0.05;
      }
      
      const drawAngle = (illusion.angle || 0) + (illusion._rollRotation || 0);
      ctx.rotate(drawAngle);

      drawStitchedPatchworkBall(ctx, illusion);

      if (illusion.isParalyzedByMahito) {
        drawMahitoFleshBubblyDeformLocal(ctx, illusion.r, illusion.paralyzeTimer, '#A855F7', illusion);
      }

      // Draw floating minion healthbar above head
      ctx.rotate(-drawAngle);
      drawMinionHealthBar(ctx, 0, -illusion.r - 14, Math.max(32, illusion.r * 1.4), 6, illusion.hp, illusion.maxHp || 100, illusion.color || '#D946EF');
      ctx.restore();

      // Mahito Soul Disfigurement Stitches on Illusions
      if ((illusion._soulDisfigurementStacks || 0) > 0 && (illusion._soulDisfigurementTimer || 0) > 0) {
        ctx.save();
        ctx.translate(illusion.x, illusion.y);
        drawSoulDisfigurementEffect(ctx, illusion.r, illusion._soulDisfigurementStacks);
        ctx.restore();
        drawSoulDisfigurementCounter(ctx, illusion.x, illusion.y, illusion.r, illusion._soulDisfigurementStacks, illusion._soulDisfigurementTimer);
      }
      continue; // Skip standard doppelganger loop
    }

    ctx.save();
    ctx.globalAlpha = 0.85;

    // Draw illusion body
    ctx.translate(illusion.x + shiverX, illusion.y + shiverY);
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

    if (illusion.isParalyzedByMahito) {
      drawMahitoFleshBubblyDeformLocal(ctx, illusion.r, illusion.paralyzeTimer, '#A855F7', illusion);
    }

    // Draw the swirling violet smoke OVER the body
    drawDopplegangerBodyEffect(ctx, 0, 0, illusion.r, 0, 'over', animTime);

    // Draw status overlays (shock, poison, burn)
    if (typeof illusion.drawStatusOverlays === 'function') {
      illusion.drawStatusOverlays(ctx, illusion.r);
    }

    if (illusion._embeddedMahitoSpikes && illusion._embeddedMahitoSpikes.length > 0) {
      drawEmbeddedMahitoSpikes(ctx, illusion.r, illusion);
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

    // Draw floating minion healthbar above head
    ctx.rotate(-illusion.angle);
    drawMinionHealthBar(ctx, 0, -illusion.r - 14, Math.max(32, illusion.r * 1.4), 6, illusion.hp, illusion.maxHp || 100, illusion.color || '#A855F7');
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

    // Floating Mahito Soul Disfigurement Stack Counter Badge (At top of body)
    if ((illusion._soulDisfigurementStacks || 0) > 0 && (illusion._soulDisfigurementTimer || 0) > 0) {
      drawSoulDisfigurementCounter(ctx, illusion.x, illusion.y, illusion.r, illusion._soulDisfigurementStacks, illusion._soulDisfigurementTimer);
    }
  }
}
