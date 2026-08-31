import { Fighter, applyDamageToTarget } from '../fighter.js';
import { CONFIG } from '../../core/config.js';
import { state, spawnFloatingText, triggerGlobalScreenShake } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { stopSound, stopSoundBySrc } from '../../systems/soundSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { spawnImpactFlash, spawnSparks, spawnAnimePunchImpactFrame, spawnMeleeClashShockwave, spawnGenosThrusterDashVisual, spawnLaserSmoke, spawnGroundScorch, spawnGenosSelfDestructExplosion } from '../../graphics/particles/sparkEffect.js';
import { drawGenosSkin, drawGenosHands } from '../../graphics/fighters/genosSkin.js';
import { projectileSystem } from '../../systems/projectileSystem.js';
import { pushTrailCap } from '../../graphics/particles/visualTrailSystem.js';

/**
 * Genos — The Demon Cyborg
 */
export class GenosFighter extends Fighter {
  constructor(def) {
    super(def);
    this.characterId = 'genos';
    this.type = 'genos';
    this.suppressSketchyOutline = true;

    // Model stats customization
    this.color = CONFIG.genos?.color || '#FF5500';
    const sizeMult = CONFIG.globalFighter?.sizeMultiplier ?? 1.0;
    const internalScale = CONFIG.internalScale ?? 1.0;
    const baseRadius = def.radius || CONFIG.genos?.radius || 25;
    this.r = baseRadius * sizeMult * internalScale;
    this.hp = CONFIG.genos?.hp || 320;
    this.maxHp = this.hp;
    this.moveSpeed = CONFIG.genos?.moveSpeed || 5.2;

    // Brawler/Ranged flags
    this.isMeleeFighter = false;
    this.punchAnimTimer = 0;
    this.punchMaxTime = 16;
    this.isRightPunch = true;
    this.hideFrontHand = false;
    this.hideBackHand = false;

    // Basic Blast animation timer
    this.basicBlastAnimTimer = 0;

    // Skill 1: Machine Gun Blows
    const initFlurryCD = CONFIG.genos?.initialFlurryCooldown !== undefined ? CONFIG.genos.initialFlurryCooldown : (CONFIG.genos?.flurryCooldown || 1200);
    this.flurryCooldown = initFlurryCD;
    this.isFlurrying = false;
    this.flurryHitsLeft = 0;
    this.flurryTimer = 0;
    this.flurryTarget = null;

    // Skill 2: Rocket Stomp & Dash
    this.dashCooldown = 0;
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashMaxTimer = CONFIG.genos?.dashDuration || 18;
    this.dashTargetX = 0;
    this.dashTargetY = 0;

    // Ultimate: Spiral Incineration Cannon
    this.ultCooldown = CONFIG.genos?.initialUltCooldown !== undefined ? CONFIG.genos.initialUltCooldown : (CONFIG.genos?.ultCooldown || 800);
    this.isChargingUlt = false;
    this.isFiringUlt = false;
    this.ultTimer = 0;
    this.ultTickTimer = 0;
    this.ultAngle = 0;

    // Passive: Core Overdrive (Self-Destruct Stasis)
    this.isSelfDestructing = false;
    this.selfDestructTimer = 0;
    this.hasExploded = false;
    this.usedSelfDestruct = false;

    // Basic Attack Ammo & Stance System
    this.maxHeatAmmo = CONFIG.genos?.maxHeatAmmo || 20;
    this.heatAmmo = this.maxHeatAmmo;
    this.isMeleeStance = false;
    this.meleeDashCount = 0; // Track thruster dashes performed during Melee Mode
    this.ammoReloadMax = CONFIG.genos?.ammoReloadFrames || 500;
    this.ammoReloadTimer = 0;
    this.meleeDashDelayTimer = 0; // Delay frames between Melee Mode thruster dashes
    this.isMeleeDashNext = true; // Alternating state machine: DASH -> REBOUNCE -> DASH -> REBOUNCE
    this._lastWallBounceFrame = 0;
    this.speedBoostTimer = 0; // High-speed thruster dash timer
    this.dashSoundCooldownTimer = 0; // Cooldown timer for genos-dash-noise.mp3

    // Movement-driven body rotation
    this.bodyRotAngle = 0; // smoothly tracks velocity direction
  }

  reset() {
    super.reset();
    const initFlurryCD = CONFIG.genos?.initialFlurryCooldown !== undefined ? CONFIG.genos.initialFlurryCooldown : (CONFIG.genos?.flurryCooldown || 1200);
    this.flurryCooldown = initFlurryCD;
    if (this.flurryTarget) {
      this.flurryTarget.caughtInGenosFlurry = false;
    }
    if (typeof state !== 'undefined') {
      if (state.fighters) state.fighters.forEach(f => { if (f) f.caughtInGenosFlurry = false; });
      if (state.illusions) state.illusions.forEach(ill => { if (ill) ill.caughtInGenosFlurry = false; });
    }
  }

  draw(ctx) {
    if (this.hasExploded) return;

    // Draw warning guide line BEHIND the skin model (world coordinates)
    const beamAngle = (this.gunAngle !== undefined) ? this.gunAngle : (this.ultAngle || this.angle || 0);
    const now = Date.now();

    if (this.isChargingUlt) {
      ctx.save();
      const beamW = CONFIG.genos?.ultBeamWidth || 70;
      // Start guide line right at the mechanical hands
      const startOffset = this.r + 5;
      const startX = this.x + Math.cos(beamAngle) * startOffset;
      const startY = this.y + Math.sin(beamAngle) * startOffset;
      const range = CONFIG.genos?.ultBeamRange || 600;
      const endX = startX + Math.cos(beamAngle) * range;
      const endY = startY + Math.sin(beamAngle) * range;

      // 1. Guide laser line (pulsing orange/red)
      ctx.strokeStyle = 'rgba(255, 50, 0, 0.7)';
      ctx.lineWidth = 3.5 + Math.sin(now * 0.04) * 1.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // 2. Guide laser core
      ctx.strokeStyle = '#FFAA00';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // 3. Crackling energy guide rings collapsing onto nozzle
      const ringCount = 3;
      for (let i = 0; i < ringCount; i++) {
        const ringProgress = ((now * 0.015) + (i / ringCount)) % 1.0;
        const dist = 80 * (1.0 - ringProgress);
        const rx = startX - Math.cos(beamAngle) * dist;
        const ry = startY - Math.sin(beamAngle) * dist;
        
        ctx.strokeStyle = `rgba(255, 140, 0, ${ringProgress * 0.8})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rx, ry, 6 + ringProgress * 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // 1. Self-Destruct Warning Radius (drawn UNDERNEATH Genos on the arena floor so his body remains crisp and clear)
    if (this.isSelfDestructing) {
      ctx.save();
      const radius = CONFIG.genos?.selfDestructRadius || 200;
      const progress = 1.0 - (this.selfDestructTimer / (CONFIG.genos?.selfDestructCountdownFrames || 150));
      const pulseAlpha = 0.25 + Math.sin(Date.now() * 0.02) * 0.15;

      // Outer Warning Perimeter Ring (Cyan / Orange Overload)
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
      ctx.lineWidth = 3.0;
      ctx.stroke();

      // Expanding Shockwave Warning Ring (Electric Cyan Glow)
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(10, radius * progress), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 255, ${pulseAlpha + 0.45})`;
      ctx.lineWidth = 4.0;
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Genos skin + health + freeze via standard pipeline (drawBody -> drawGenosSkin)
    super.draw(ctx);
  }

  drawBody(ctx) {
    // drawGenosSkin handles its own translate/rotate from world coords
    drawGenosSkin(ctx, this);
  }

  drawGun(ctx) {
    // Mechanical hands are rendered here in drawGun so they overlay the body outline!
    drawGenosHands(ctx, this);
  }

  // Draw the beam overlay on top of all fighters, outlines, and hands!
  drawBeamOverlay(ctx) {
    if (this.hp <= 0 || !this.isFiringUlt) return; // Beam geometry only renders while actively firing

    const isDarkMode = Boolean(
      typeof state !== 'undefined' && (
        state.arenaTheme === 'dark' || 
        state.darkMode || 
        (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('arena-dark-mode'))
      )
    );

    const beamAngle = (this.gunAngle !== undefined) ? this.gunAngle : (this.ultAngle || this.angle || 0);
    const now = Date.now();

    const beamW = CONFIG.genos?.ultBeamWidth || 70;
    const range = CONFIG.genos?.ultBeamRange || 1200;
    // Set startOffset to emerging right from mechanical hands
    const startOffset = this.r + 5;
    const startX = this.x + Math.cos(beamAngle) * startOffset;
    const startY = this.y + Math.sin(beamAngle) * startOffset;
    const endX = startX + Math.cos(beamAngle) * range;
    const endY = startY + Math.sin(beamAngle) * range;

    // Flickering beam width
    const flickerW = beamW * (0.94 + Math.sin(now * 0.12) * 0.06);

    if (isDarkMode) {
      this._drawPixelBeamOverlay(ctx, beamAngle, now, flickerW, beamW, range, startX, startY, endX, endY);
      return;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // ── RELEASE FLARE EFFECT (First 16 frames of beam release - Gojo Purple Style) ──
    const totalDuration = CONFIG.genos?.ultDurationFrames || 120;
    const timeFired = totalDuration - (this.ultTimer || 0);
    if (timeFired <= 16) {
      const flareProgress = timeFired / 16;
      const flareAlpha = Math.sin(flareProgress * Math.PI); // Ramps up to 1 and down to 0
      const flareRadius = flickerW * (1.6 + flareProgress * 1.4);
      
      ctx.save();
      ctx.translate(startX, startY);
      ctx.rotate(beamAngle);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = flareAlpha;

      // 1. Perpendicular Anamorphic Lens Flare Line (Orange/Gold/White)
      const flareGrad = ctx.createLinearGradient(0, -flareRadius * 2.2, 0, flareRadius * 2.2);
      flareGrad.addColorStop(0, 'rgba(255, 60, 0, 0)');
      flareGrad.addColorStop(0.3, 'rgba(255, 140, 0, 0.75)');
      flareGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1.0)');
      flareGrad.addColorStop(0.7, 'rgba(255, 140, 0, 0.75)');
      flareGrad.addColorStop(1, 'rgba(255, 60, 0, 0)');

      ctx.strokeStyle = flareGrad;
      ctx.lineWidth = 7.0 * flareAlpha;
      ctx.beginPath();
      ctx.moveTo(0, -flareRadius * 2.2);
      ctx.lineTo(0, flareRadius * 2.2);
      ctx.stroke();

      // 2. 8-Point Radiant Incineration Starburst Flare Rays
      ctx.strokeStyle = `rgba(255, 230, 150, ${flareAlpha * 0.95})`;
      ctx.lineWidth = 2.5;
      for (let k = 0; k < 8; k++) {
        const rAngle = (k * Math.PI) / 4;
        const rLen = flareRadius * (k % 2 === 0 ? 1.5 : 0.85);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(rAngle) * rLen, Math.sin(rAngle) * rLen);
        ctx.stroke();
      }

      // 3. Central Blinding Fusion Core Flare
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, flareRadius * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // ── Bloom layered strokes ──
    // Layer 1: Wide Thermal Bloom
    ctx.strokeStyle = 'rgba(255, 60, 0, 0.09)';
    ctx.lineWidth = flickerW * 1.70;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Layer 2: Secondary heat wave bloom
    ctx.strokeStyle = 'rgba(255, 80, 0, 0.22)';
    ctx.lineWidth = flickerW * 1.35;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Layer 3: Outer fire flare plume
    ctx.strokeStyle = 'rgba(255, 100, 0, 0.45)';
    ctx.lineWidth = flickerW * 1.10;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Layer 4: Main Incineration Column
    ctx.strokeStyle = 'rgba(255, 140, 0, 0.70)';
    ctx.lineWidth = flickerW * 0.82;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Layer 5: Inner Plasma Core
    ctx.strokeStyle = 'rgba(255, 225, 0, 0.90)';
    ctx.lineWidth = flickerW * 0.50;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Layer 6: Fusion Core Center (White)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = flickerW * 0.20;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // ── Muzzle Burst Bloom ──
    ctx.fillStyle = 'rgba(255, 60, 0, 0.45)';
    ctx.beginPath();
    ctx.arc(startX, startY, flickerW * 1.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 150, 0, 0.75)';
    ctx.beginPath();
    ctx.arc(startX, startY, flickerW * 0.75, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 230, 100, 0.92)';
    ctx.beginPath();
    ctx.arc(startX, startY, flickerW * 0.45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(startX, startY, flickerW * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // ── Shockwave Rings ──
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const ringDist = ((now * 0.24) + i * (range / ringCount)) % range;
      const rx = startX + Math.cos(beamAngle) * ringDist;
      const ry = startY + Math.sin(beamAngle) * ringDist;
      
      ctx.strokeStyle = `rgba(255, 230, 150, ${(1.0 - ringDist / range) * 0.75})`;
      ctx.lineWidth = 3.5;
      
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(beamAngle);
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, flickerW * 0.65, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Authentic 2D discrete grid-scan pixel art rasterizer for Genos's Spiral Incineration Cannon Beam (Dark Mode).
   * Renders in unrotated world coordinates (P = 2.0px) for authentic staircase pixel edges matching Rule #35.
   */
  _drawPixelBeamOverlay(ctx, beamAngle, now, flickerW, beamW, range, startX, startY, endX, endY) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const P = 2.0;
    const snap = (v) => Math.round(v / P) * P;

    const cosA = Math.cos(beamAngle);
    const sinA = Math.sin(beamAngle);
    const perpX = -sinA;
    const perpY = cosA;

    const halfW = Math.max(P * 3, snap(flickerW * 0.5));
    const tier1Half = Math.max(P, snap(halfW * 0.18)); // Superheated white fusion core
    const tier2Half = Math.max(P * 2, snap(halfW * 0.42)); // Solar golden plasma
    const tier3Half = Math.max(P * 3, snap(halfW * 0.72)); // Saturated fiery orange column
    const tier4Half = halfW;                              // Magma crimson outer body
    const auraHalf  = snap(halfW * 1.30);                 // Stepped pixel thermal aura

    const totalDuration = CONFIG.genos?.ultDurationFrames || 120;
    const timeFired = totalDuration - (this.ultTimer || 0);

    // ── 1. Anamorphic Stepped Pixel Flare & Starburst (First 16 frames) ──
    if (timeFired <= 16) {
      const flareProg = timeFired / 16;
      const flareAlpha = Math.sin(flareProg * Math.PI);
      const flareR = snap(flickerW * (1.6 + flareProg * 1.4));

      ctx.save();
      ctx.globalAlpha = flareAlpha;

      // A. Vertical Anamorphic Stepped Lens Flare Line in World Space
      for (let gy = -flareR * 2.2; gy <= flareR * 2.2; gy += P) {
        const absY = Math.abs(gy);
        const normY = absY / (flareR * 2.2);
        const thick = Math.max(P, snap((1.0 - normY) * P * 3.5));

        for (let gx = -thick; gx <= thick; gx += P) {
          const wx = snap(startX + gx);
          const wy = snap(startY + gy);
          if (Math.abs(gx) < P && normY < 0.45) {
            ctx.fillStyle = '#FFFFFF';
          } else if (normY < 0.7) {
            ctx.fillStyle = '#FFE600';
          } else {
            ctx.fillStyle = '#FF5500';
          }
          ctx.fillRect(wx, wy, P, P);
        }
      }

      // B. 8-Point Stepped Diamond Starburst Rays in World Space
      for (let k = 0; k < 8; k++) {
        const rAngle = (k * Math.PI) / 4;
        const rLen = flareR * (k % 2 === 0 ? 1.4 : 0.8);
        const cosR = Math.cos(rAngle);
        const sinR = Math.sin(rAngle);

        for (let st = 0; st <= rLen; st += P * 0.75) {
          const wx = snap(startX + cosR * st);
          const wy = snap(startY + sinR * st);
          ctx.fillStyle = (st < rLen * 0.35) ? '#FFFFFF' : ((st < rLen * 0.75) ? '#FFE600' : '#FF5500');
          ctx.fillRect(wx, wy, P, P);
        }
      }

      // C. Central White-Hot Core Diamond
      const coreR = snap(flareR * 0.40);
      for (let dy = -coreR; dy <= coreR; dy += P) {
        const spanX = coreR - Math.abs(dy);
        for (let dx = -spanX; dx <= spanX; dx += P) {
          const wx = snap(startX + dx);
          const wy = snap(startY + dy);
          ctx.fillStyle = (Math.abs(dx) + Math.abs(dy) < coreR * 0.5) ? '#FFFFFF' : '#FFE600';
          ctx.fillRect(wx, wy, P, P);
        }
      }

      ctx.restore();
    }

    // ── 2. Discrete 2D Stepped Pixel Beam Grid in World Space (0 to range) ──
    const stepL = P * 0.75;
    const stepV = P * 0.75;

    // A. Outer Atmosphere Stepped Pixel Aura
    ctx.fillStyle = 'rgba(255, 68, 0, 0.40)';
    for (let u = 0; u <= range; u += stepL) {
      const cx = startX + cosA * u;
      const cy = startY + sinA * u;
      for (let v = -auraHalf; v <= auraHalf; v += stepV) {
        const absV = Math.abs(v);
        if (absV <= tier4Half) continue;
        const wx = snap(cx + perpX * v);
        const wy = snap(cy + perpY * v);
        ctx.fillRect(wx, wy, P, P);
      }
    }

    // B. Discrete Multi-Tier Beam Column with Obsidian Borders
    for (let u = 0; u <= range; u += stepL) {
      const cx = startX + cosA * u;
      const cy = startY + sinA * u;

      for (let v = -tier4Half; v <= tier4Half; v += stepV) {
        const absV = Math.abs(v);
        const isBorder = (absV >= tier4Half - P);

        let pixelColor;
        if (isBorder) {
          pixelColor = '#150500'; // Dark manga obsidian border shell
        } else if (absV < P * 1.2) {
          pixelColor = '#FFFFFF'; // Superheated pure white-hot fusion core
        } else if (absV <= tier1Half) {
          pixelColor = '#FFFFEE';
        } else if (absV <= tier2Half) {
          pixelColor = '#FFE600'; // Solar golden plasma
        } else if (absV <= tier3Half) {
          pixelColor = '#FF5500'; // Genos signature fiery orange
        } else {
          pixelColor = '#CC2A00'; // Magma crimson outer body
        }

        const wx = snap(cx + perpX * v);
        const wy = snap(cy + perpY * v);
        ctx.fillStyle = pixelColor;
        ctx.fillRect(wx, wy, P, P);
      }
    }

    // C. Longitudinal High-Energy Stepped Plasma Wave Pulses
    const pulseCount = 8;
    for (let pl = 0; pl < pulseCount; pl++) {
      const pSpeed = 24 + (pl % 3) * 8;
      const pTravel = snap((now * 0.06 * pSpeed + pl * 160) % range);
      const pLen = snap(40 + (pl % 3) * 30);
      const pY = snap(((pl % 5) - 2) * (tier2Half * 0.65));

      ctx.fillStyle = (pl % 2 === 0) ? '#FFFFFF' : '#FFE600';
      for (let pu = pTravel; pu <= pTravel + pLen && pu <= range; pu += stepL) {
        const wx = snap(startX + cosA * pu + perpX * pY);
        const wy = snap(startY + sinA * pu + perpY * pY);
        ctx.fillRect(wx, wy, P, P);
      }
    }

    // ── 3. Stepped Muzzle Blast Arc at (startX, startY) in World Coordinates ──
    const muzzleR = snap(halfW * 1.35);
    for (let dy = -muzzleR; dy <= muzzleR; dy += P) {
      const absY = Math.abs(dy);
      for (let dx = -muzzleR; dx <= muzzleR; dx += P) {
        const dist = Math.hypot(dx, dy);
        if (dist > muzzleR) continue;

        const wx = snap(startX + dx);
        const wy = snap(startY + dy);

        if (dist >= muzzleR - P) {
          ctx.fillStyle = '#150500';
        } else if (dist < muzzleR * 0.30) {
          ctx.fillStyle = '#FFFFFF';
        } else if (dist < muzzleR * 0.60) {
          ctx.fillStyle = '#FFE600';
        } else if (dist < muzzleR * 0.85) {
          ctx.fillStyle = '#FF5500';
        } else {
          ctx.fillStyle = '#B32400';
        }
        ctx.fillRect(wx, wy, P, P);
      }
    }

    // ── 4. Stepped Transonic Mach Condensation Rings in World Coordinates ──
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      const ringDist = snap(((now * 0.24) + i * (range / ringCount)) % range);
      const alphaRing = (1.0 - ringDist / range);
      if (alphaRing < 0.05) continue;

      const rcx = startX + cosA * ringDist;
      const rcy = startY + sinA * ringDist;
      const ringW = snap(P * 3);
      const ringH = snap(halfW * 1.25);
      const steps = 28;

      for (let st = 0; st < steps; st++) {
        const ang = (st / steps) * Math.PI * 2;
        const rx = Math.cos(ang) * ringW;
        const ry = Math.sin(ang) * ringH;

        // Rotate ring orientation to align perpendicular to beam vector
        const wx = snap(rcx + rx * cosA - ry * sinA);
        const wy = snap(rcy + rx * sinA + ry * cosA);

        ctx.fillStyle = '#150500';
        ctx.fillRect(wx + P, wy, P, P);
        ctx.fillRect(wx - P, wy, P, P);
        ctx.fillStyle = (st % 2 === 0) ? '#FFE600' : '#FF5500';
        ctx.fillRect(wx, wy, P, P);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(wx, wy, P, P);
      }
    }

    ctx.restore();
  }

  takeDamage(amount, attacker, opts = {}) {
    // 1. Invulnerable / Intangible during post-explosion piece reassembly
    if (this.isSelfDestructRecovering) {
      return false;
    }

    // 2. High DEF while charging core overload countdown
    if (this.isSelfDestructing) {
      const isTrueDamage = Boolean(opts && (opts.isTrueDamage || opts.trueDamage || opts.isPureLoveBeam || opts.isPurpleDPS));
      let finalAmount = amount;
      const defReduction = CONFIG.genos?.selfDestructDamageReduction ?? 0.75;
      if (!isTrueDamage && defReduction > 0) {
        finalAmount *= (1 - defReduction);
        // Deflection sparks on reinforced cybernetic armor
        if (typeof spawnSparks === 'function') {
          spawnSparks(this.x, this.y, 4, 'flash_layla', '#00E5FF');
        }
      }

      // Ensure Core Overdrive completes its countdown without premature death
      const currentHp = Number(this.hp) || 0;
      const nextHp = currentHp - finalAmount;
      if (nextHp <= 0) {
        this.hp = 1;
        this.hitFlashTimer = 6;
        return true;
      }

      return super.takeDamage(finalAmount, attacker, opts);
    }

    // 3. Trigger Core Overdrive when HP drops to threshold (non-fatal damage only)
    const thresholdRatio = CONFIG.genos?.selfDestructHpThreshold ?? CONFIG.genos?.selfDestructThreshold ?? 0.10;
    const sdThreshold = this.maxHp * thresholdRatio;
    const nextHp = this.hp - amount;

    if (!this.usedSelfDestruct && nextHp > 0 && nextHp <= sdThreshold) {
      this.hp = Math.max(1, Math.min(sdThreshold, nextHp));
      this.isSelfDestructing = true;
      this.selfDestructTimer = CONFIG.genos?.selfDestructCountdownFrames || 150;
      
      this.interruptAttacks(true);
      this.hitFlashTimer = 8;
      audioSystem.playSFX('attack_fleshhit', 0.6);

      // Play self-destruct charging audio
      if (CONFIG.genos?.selfDestructChargeEnabled !== false) {
        const chargeSrc = CONFIG.genos?.selfDestructChargeSound || 'Assets/Sound Effects/Skills/genos-selfdestruct-charging.mp3';
        const chargeVol = CONFIG.genos?.selfDestructChargeVolume ?? 2.0;
        this._selfDestructChargeHandle = audioSystem.playSFX(chargeSrc, chargeVol);
      }

      if (typeof spawnFloatingText === 'function') {
        // Spawn damage text for the amount taken
        spawnFloatingText(this.x, this.y - this.r - 8, `${Math.round(amount)}`, attacker?.color || '#ff4444');
        // Spawn overload warning
        spawnFloatingText(this.x, this.y - this.r - 28, "CORE OVERLOAD", "#FF0000");
      }
      return true;
    }

    // Otherwise, apply damage normally via base class (if hit is fatal, he dies instantly)
    return super.takeDamage(amount, attacker, opts);
  }

  triggerPunchAnimation() {
    this.isRightPunch = !this.isRightPunch;
    this.punchAnimTimer = this.punchMaxTime;
  }

  /**
   * Overrides base Fighter shoot method to fire Genos's signature Incineration Palm fire blast.
   */
  shoot(ownerIndex) {
    if (!this.canPerformBasicAttack()) return false;
    if (this.isSelfDestructing || this.isChargingUlt || this.isFiringUlt || this.isDashing || this.isFlurrying) {
      return;
    }

    const angle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

    // ── MELEE MODE (PUNCH ATTACK) ──
    if (this.isMeleeStance || this.heatAmmo <= 0) {
      // Guarantee stance flag and reload timer are active — covers edge cases
      // where heatAmmo reached 0 but isMeleeStance wasn't set yet.
      if (!this.isMeleeStance) {
        this.isMeleeStance = true;
        this.meleeDashCount = 0;
        this.ammoReloadTimer = this.ammoReloadMax;
        if (typeof spawnFloatingText === 'function') {
          spawnFloatingText(this.x, this.y - this.r - 28, "MELEE MODE", "#FF4400");
        }
      }

      const reach = CONFIG.genos?.meleePunchReach || 65;
      const damage = CONFIG.genos?.meleePunchDamage || 16;
      const halfArc = (Math.PI * 0.5) / 2; // 90° frontal arc

      // ── Scan targets FIRST before committing to the attack ──
      const targetsToScan = [];
      if (state.fighters) state.fighters.forEach(f => { if (f && f !== this && f.hp > 0) targetsToScan.push(f); });
      if (state.illusions) state.illusions.forEach(ill => { if (ill && ill.hp > 0) targetsToScan.push(ill); });

      let hitAny = false;
      for (const target of targetsToScan) {
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        if (dist <= this.r + reach + target.r) {
          const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
          let angleDiff = angleToTarget - angle;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

          if (Math.abs(angleDiff) <= halfArc) {
            hitAny = true;
            applyDamageToTarget(target, damage, this, { isBasic: true });

            const pushForce = CONFIG.genos?.meleePunchKnockback || 9.0;
            const pushAngle = Math.atan2(target.y - this.y, target.x - this.x);
            const pushVx = Math.cos(pushAngle) * pushForce;
            const pushVy = Math.sin(pushAngle) * pushForce;
            if (typeof target.applyKnockback === 'function') {
              target.applyKnockback(pushVx, pushVy);
            } else {
              target.vx += pushVx;
              target.vy += pushVy;
            }
            if (typeof spawnAnimePunchImpactFrame === 'function') {
              spawnAnimePunchImpactFrame(target.x, target.y, 55, pushAngle, 'gold');
            }
            if (typeof spawnMeleeClashShockwave === 'function') {
              spawnMeleeClashShockwave(target.x, target.y, 65, 'gojo');
            }
            if (typeof spawnImpactFlash === 'function') {
              spawnImpactFlash(target.x, target.y, 30, '#FF8800');
            }
            if (typeof spawnSparks === 'function') {
              spawnSparks(target.x, target.y, 8, 'orange');
            }
          }
        }
      }

      // Only commit animation, sound, and cooldown if we actually connected
      if (hitAny) {
        this._basicHitConnectedTimer = 10; // Enable hand fire aura & punch impact visuals for 10 frames
        this.triggerPunchAnimation();
        this.shootCooldown = CONFIG.genos?.meleePunchCooldown || 15;
        if (typeof triggerGlobalScreenShake === 'function') {
          triggerGlobalScreenShake(1.2, 8);
        }
        if (CONFIG.genos?.meleePunchEnabled !== false) {
          const punchSrc = CONFIG.genos?.meleePunchSound || 'Assets/Sound Effects/Attacks/punch.mp3';
          const punchVol = CONFIG.genos?.meleePunchVolume ?? 2.8;
          audioSystem.playSFX(punchSrc, punchVol);
        }
      }
      return;
    }

    // ── RANGED MODE (INCINERATION FIREBALL) ──
    this.heatAmmo--;
    this.basicBlastAnimTimer = 30;
    this.shootCooldown = CONFIG.genos?.blastCooldown || 27;
    this.isRightBlast = !this.isRightBlast;

    // Calculate alternating spawn point at active firing hand
    let spawnX = this.x + Math.cos(angle) * (this.r + 15);
    let spawnY = this.y + Math.sin(angle) * (this.r + 15);
    const sideOffset = this.isRightBlast ? -12 : 12;
    const perpAngle = angle + Math.PI / 2;
    spawnX += Math.cos(perpAngle) * sideOffset;
    spawnY += Math.sin(perpAngle) * sideOffset;

    const speed = CONFIG.genos?.blastSpeed || 20;
    const damage = CONFIG.genos?.blastDamage || 14;
    const range = CONFIG.genos?.blastRange || 350;
    const blastRadius = CONFIG.genos?.blastAoeRadius || 35;
    const projRadius = CONFIG.genos?.blastProjectileRadius || 9;

    // Fire custom fireball projectile using projectileSystem
    if (projectileSystem) {
      const idx = ownerIndex !== undefined ? ownerIndex : (state.fighters ? state.fighters.indexOf(this) : 0);
      const p = projectileSystem.fireProjectile(
        this,
        idx >= 0 ? idx : 0,
        damage,
        false,
        speed,
        false,
        'genosFireball',
        spawnX,
        spawnY,
        angle
      );
      if (p) {
        p.color = '#FF5500';
        p.r = projRadius;
        p.visual = 'genosFireball';
        p.isExplosive = true;
        p.explosionRadius = blastRadius;
        p.maxLife = Math.floor(range / speed);
        p.life = p.maxLife;
      }
    }

    // Spawn orange heat spark flash at the palm tip
    if (typeof spawnImpactFlash === 'function') {
      spawnImpactFlash(spawnX, spawnY, 28, '#FF5500');
    }
    if (typeof spawnSparks === 'function') {
      spawnSparks(spawnX, spawnY, 8, 'orange');
    }

    // Spawn back-thrust heat exhaust wisps opposite to firing angle
    const backX = this.x - Math.cos(angle) * (this.r + 5);
    const backY = this.y - Math.sin(angle) * (this.r + 5);
    if (typeof spawnSparks === 'function') {
      spawnSparks(backX, backY, 4, 'orange');
    }

    if (CONFIG.genos?.basicBlastEnabled !== false) {
      const blastSrc = CONFIG.genos?.basicBlastSound || 'Assets/Sound Effects/Attacks/genos-range-attack.mp3';
      const blastVol = CONFIG.genos?.basicBlastVolume ?? 2.0;
      audioSystem.playSFX(blastSrc, blastVol);
    }

    // Switch to Melee Mode when ammo runs out
    if (this.heatAmmo <= 0) {
      if (!this.isMeleeStance) {
        this.isMeleeStance = true;
        this.meleeDashCount = 0;
        this.ammoReloadTimer = this.ammoReloadMax;
        this.isMeleeDashNext = true; // First wall action in Melee Mode is a DASH!
        this._justEnteredMeleeStance = true;
        if (typeof spawnFloatingText === 'function') {
          spawnFloatingText(this.x, this.y - this.r - 28, "MELEE MODE", "#FF4400");
        }
      }
    }
  }

  executeBasicBlast(opponent) {
    const ownerIndex = state.fighters ? state.fighters.indexOf(this) : 0;
    this.shoot(ownerIndex >= 0 ? ownerIndex : 0);
  }

  executeMachineGunBlows(opponent) {
    if (this.flurryCooldown > 0 || !opponent) return;

    this.isFlurrying = true;
    this.flurryHitsLeft = CONFIG.genos?.flurryHitCount || 15;
    this.flurryTimer = 0;
    this.flurryTarget = opponent;
    this.flurryCooldown = CONFIG.genos?.flurryCooldown || 1200;

    const oldX = this.x;
    const oldY = this.y;

    // Dash into close range
    const flurryOffset = CONFIG.genos?.dashes?.flurryDashOffset ?? 25;
    const angleToTarget = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.x = opponent.x - Math.cos(angleToTarget) * (this.r + opponent.r + flurryOffset);
    this.y = opponent.y - Math.sin(angleToTarget) * (this.r + opponent.r + flurryOffset);
    this.aim(opponent);

    // Spawn smooth fading trail afterimages along the dash path
    if (!this.afterImages) this.afterImages = [];
    const steps = 3;
    for (let s = 1; s <= steps; s++) {
      const p = s / steps;
      pushTrailCap(this.afterImages, {
        x: oldX + (this.x - oldX) * p,
        y: oldY + (this.y - oldY) * p,
        r: this.r,
        gunAngle: this.gunAngle || this.angle || 0,
        timer: 10 + s * 2,
        maxTimer: 10 + s * 2
      });
    }

    // Immediately stop target enemy movement on Skill 1 activation
    if (opponent && opponent.hp > 0) {
      opponent.vx = 0;
      opponent.vy = 0;
      opponent.caughtInGenosFlurry = true;
      if (opponent.knockbackVx !== undefined) opponent.knockbackVx = 0;
      if (opponent.knockbackVy !== undefined) opponent.knockbackVy = 0;
      if (typeof opponent.applyTimeStop === 'function') {
        opponent.applyTimeStop(25, { isSkill: true });
      }
    }

    if (typeof spawnFloatingText === 'function') {
      spawnFloatingText(this.x, this.y - this.r - 28, "MACHINE GUN BLOWS!", "#FF5500");
    }
    if (CONFIG.genos?.flurryVoiceEnabled !== false) {
      const delay = CONFIG.genos?.flurryVoiceDelay || 0;
      if (delay > 0) {
        this.flurryVoiceTimer = delay;
      } else {
        const flurrySrc = CONFIG.genos?.flurryVoiceSound || 'Assets/Sound Effects/Skills/genos-machinegunblow-voice.mp3';
        const flurryVol = CONFIG.genos?.flurryVoiceVolume ?? 2.5;
        audioSystem.playSFX(flurrySrc, flurryVol);
      }
    }
  }

  performStompExplosion() {
    this.triggerPunchAnimation(); // Trigger slam animation pose

    // Ground Stomp Explosion
    const radius = CONFIG.genos?.dashes?.rocketDash?.stompRadius ?? CONFIG.genos?.stompRadius ?? 75;
    const damage = CONFIG.genos?.dashes?.rocketDash?.stompDamage ?? CONFIG.genos?.stompDamage ?? 30;
    
    if (typeof triggerGlobalScreenShake === 'function') {
      triggerGlobalScreenShake(2.5, 18);
    }
    audioSystem.playSFX('Assets/Sound Effects/Attacks/groundSmash.mp3', 1.5);

    // ── STOMP EXPANDING THERMAL SHOCKWAVE RING ──
    if (typeof spawnMeleeClashShockwave === 'function') {
      spawnMeleeClashShockwave(this.x, this.y, radius * 1.35, 'genos');
    }

    const targetsToScan = [];
    if (state.fighters) {
      state.fighters.forEach(f => {
        if (f && f !== this && f.hp > 0) {
          targetsToScan.push(f);
          if (f.rika && f.rika.active && !f.rika.isDying && f.rika.hp > 0 && !targetsToScan.includes(f.rika)) {
            targetsToScan.push(f.rika);
          }
        }
      });
    }
    if (state.illusions) {
      state.illusions.forEach(ill => {
        if (ill && ill.hp > 0 && !targetsToScan.includes(ill)) {
          targetsToScan.push(ill);
        }
      });
    }

    for (const target of targetsToScan) {
      if (Math.hypot(target.x - this.x, target.y - this.y) <= radius + target.r) {
        applyDamageToTarget(target, damage, this, { isSkill: true });
        const pushForce = CONFIG.genos?.dashes?.rocketDash?.stompKnockback ?? CONFIG.genos?.stompKnockback ?? 14;
        const pushAngle = Math.atan2(target.y - this.y, target.x - this.x);
        target.vx += Math.cos(pushAngle) * pushForce;
        target.vy += Math.sin(pushAngle) * pushForce;
      }
    }
  }

  executeRocketStomp(opponent) {
    if (this.dashCooldown > 0) return;

    this.dashCooldown = CONFIG.genos?.dashes?.rocketDash?.cooldown ?? CONFIG.genos?.dashCooldown ?? 360;
    this.performStompExplosion();
  }

  executeRocketDash(opponent) {
    this.executeRocketStomp(opponent);
  }

  interruptAttacks(forceCancelAll = false) {
    if (this.isChargingUlt || this.isFiringUlt) {
      this.isChargingUlt = false;
      this.isFiringUlt = false;
      this.ultTimer = 0;
    }
    if (this.flurryTarget) {
      this.flurryTarget.caughtInGenosFlurry = false;
    }
    if (typeof state !== 'undefined') {
      if (state.fighters) state.fighters.forEach(f => { if (f) f.caughtInGenosFlurry = false; });
      if (state.illusions) state.illusions.forEach(ill => { if (ill) ill.caughtInGenosFlurry = false; });
    }
    this.isFlurrying = false;
    this.flurryHitsLeft = 0;
    this.flurryTarget = null;
    this.flurryVoiceTimer = 0;

    // Immediately stop ALL active audio handles & voice audio instances when interrupted
    if (this.soundHandle) {
      try { stopSound(this.soundHandle); } catch (e) {}
      this.soundHandle = null;
    }
    if (this._ultChargeSoundHandle) {
      try { stopSound(this._ultChargeSoundHandle); } catch (e) {}
      this._ultChargeSoundHandle = null;
    }
    if (this._selfDestructChargeHandle) {
      try { stopSound(this._selfDestructChargeHandle); } catch (e) {}
      this._selfDestructChargeHandle = null;
    }

    try { stopSoundBySrc('Assets/Sound Effects/Skills/genos-incenerate-voice.mp3'); } catch (e) {}
    try { stopSoundBySrc('Assets/Sound Effects/Skills/genos-ultimatecharging.mp3'); } catch (e) {}
    if (forceCancelAll) {
      try { stopSoundBySrc('Assets/Sound Effects/Skills/genos-machinegunblow-voice.mp3'); } catch (e) {}
    }
    try { stopSoundBySrc('Assets/Sound Effects/Skills/genos-selfdestruct-charging.mp3'); } catch (e) {}

    super.interruptAttacks(forceCancelAll);
  }

  executeSpiralIncinerationCannon(opponent) {
    if (this.ultCooldown > 0 || !opponent) return;

    this.isChargingUlt = true;
    this.ultTimer = CONFIG.genos?.ultWindupFrames || 60;
    this.ultCooldown = CONFIG.genos?.ultCooldown || 1680;
    this.ultAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
    this.gunAngle = this.ultAngle;
    this.angle = this.ultAngle;

    spawnFloatingText(this.x, this.y - this.r - 28, "SPIRAL INCINERATION CANNON!", "#FF3300");
    const windupShake = CONFIG.genos?.ultWindupShakeIntensity || 0;
    if (windupShake > 0) {
      triggerGlobalScreenShake(windupShake, CONFIG.genos?.ultWindupShakeDuration || 6);
    }
    if (CONFIG.genos?.ultVoiceEnabled !== false) {
      const ultVoiceSrc = CONFIG.genos?.ultVoiceSound || 'Assets/Sound Effects/Skills/genos-incenerate-voice.mp3';
      const ultVoiceVol = CONFIG.genos?.ultVoiceVolume ?? 3.5;
      this.soundHandle = audioSystem.playSFX(ultVoiceSrc, ultVoiceVol);
    }

    if (CONFIG.genos?.ultChargeEnabled !== false) {
      const ultChargeSrc = CONFIG.genos?.ultChargeSound || 'Assets/Sound Effects/Skills/genos-ultimatecharging.mp3';
      const ultChargeVol = CONFIG.genos?.ultChargeVolume ?? 2.0;
      this._ultChargeSoundHandle = audioSystem.playSFX(ultChargeSrc, ultChargeVol);
    }
  }

  performSelfDestructExplosion() {
    this.isSelfDestructing = false;
    this.usedSelfDestruct = true;

    // Immediately restore recovered HP upon explosion
    const cfg = CONFIG.genos || {};
    const healPct = cfg.selfDestructHpRecoveryPercent ?? cfg.selfDestructRecoveryHpPercent ?? 0.30;
    const flatHeal = cfg.selfDestructHpRecoveryFlat || 0;
    const recoveredHp = Math.max(1, Math.round(this.maxHp * healPct) + flatHeal);
    this.hp = Math.min(this.maxHp, recoveredHp);
    this._healthBarHealTimer = 40; // Vibrant green glow on HUD health bar
    if (typeof spawnFloatingText === 'function') {
      spawnFloatingText(this.x, this.y - this.r - 28, `+${recoveredHp} HP`, "#39FF14");
    }

    // Immediately kill charging audio handle & any active charging sound instance so it's completely gone!
    if (this._selfDestructChargeHandle) {
      try { stopSound(this._selfDestructChargeHandle); } catch (e) {}
      this._selfDestructChargeHandle = null;
    }
    const chargeSrc = CONFIG.genos?.selfDestructChargeSound || 'Assets/Sound Effects/Skills/genos-selfdestruct-charging.mp3';
    try { stopSoundBySrc(chargeSrc); } catch (e) {}

    const shakeIntensity = CONFIG.genos?.selfDestructShakeIntensity || 18;
    const shakeDuration = CONFIG.genos?.selfDestructShakeDuration || 50;
    triggerGlobalScreenShake(shakeIntensity, shakeDuration);
    const sdSoundSrc = CONFIG.genos?.selfDestructSound || 'Assets/Sound Effects/Skills/genos-selfdestruct-explosion.mp3';
    const sdSoundVol = CONFIG.genos?.selfDestructVolume ?? 2.5;
    audioSystem.playSFX(sdSoundSrc, sdSoundVol);

    const radius = CONFIG.genos?.selfDestructRadius || 200;
    const damage = CONFIG.genos?.selfDestructDamage || 250;
    const blastKnockback = CONFIG.genos?.selfDestructKnockback || 20;

    // Scan all valid targets (fighters, illusions & Rika) in radius (Rule #6 compliant)
    const targetsToScan = [];
    if (state.fighters) {
      state.fighters.forEach(f => {
        if (f && f !== this && f.hp > 0) {
          targetsToScan.push(f);
          if (f.rika && f.rika.active && !f.rika.isDying && f.rika.hp > 0 && !targetsToScan.includes(f.rika)) {
            targetsToScan.push(f.rika);
          }
        }
      });
    }
    if (state.illusions) {
      state.illusions.forEach(ill => {
        if (ill && ill.hp > 0 && !targetsToScan.includes(ill)) {
          targetsToScan.push(ill);
        }
      });
    }

    for (const target of targetsToScan) {
      const dist = Math.hypot(target.x - this.x, target.y - this.y);
      if (dist <= radius + target.r) {
        applyDamageToTarget(target, damage, this, { isExplosion: true, isUltimate: true });
        const pushAngle = Math.atan2(target.y - this.y, target.x - this.x);
        target.vx += Math.cos(pushAngle) * blastKnockback;
        target.vy += Math.sin(pushAngle) * blastKnockback;
      }
    }

    // ── VISUAL EFFECTS: Epic High-Fidelity Anime Self-Destruct Explosion ──
    if (typeof spawnGenosSelfDestructExplosion === 'function') {
      spawnGenosSelfDestructExplosion(this.x, this.y, radius);
    }

    // Delete enemy projectiles caught in blast
    if (state.projectiles) {
      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        if (p && Math.hypot(p.x - this.x, p.y - this.y) <= radius) {
          state.projectiles.splice(i, 1);
        }
      }
    }

    // Trigger post-explosion breather recovery pause & shattered piece reassembly
    this.isSelfDestructRecovering = true;
    this.selfDestructRecoveryMax = CONFIG.genos?.selfDestructRecoveryFrames || 90;
    this.selfDestructRecoveryTimer = this.selfDestructRecoveryMax;

    // Initialize shattered cybernetic pieces array for magnetic piece-by-piece reassembly (Wide dramatic scatter distance)
    const r = this.r || 25;
    this.shatteredPieces = [
      { id: 'hair',          targetX: 0,        targetY: -r * 0.45, scatterX: -45 + (Math.random() - 0.5) * 25, scatterY: -95 - Math.random() * 30, rot: (Math.random() - 0.5) * 2.5, snapped: false },
      { id: 'leftShoulder',  targetX: -r * 0.75, targetY: -r * 0.02, scatterX: -110 - Math.random() * 30, scatterY: -25 + (Math.random() - 0.5) * 40, rot: (Math.random() - 0.5) * 3.0, snapped: false },
      { id: 'rightShoulder', targetX:  r * 0.75, targetY: -r * 0.02, scatterX:  110 + Math.random() * 30, scatterY: -25 + (Math.random() - 0.5) * 40, rot: (Math.random() - 0.5) * 3.0, snapped: false },
      { id: 'leftVest',     targetX: -r * 0.42, targetY:  r * 0.08, scatterX: -85 - Math.random() * 25, scatterY:  75 + Math.random() * 30, rot: (Math.random() - 0.5) * 2.8, snapped: false },
      { id: 'rightVest',    targetX:  r * 0.42, targetY:  r * 0.08, scatterX:  85 + Math.random() * 25, scatterY:  75 + Math.random() * 30, rot: (Math.random() - 0.5) * 2.8, snapped: false },
      { id: 'bezelFrame',   targetX: 0,        targetY: -r * 0.02, scatterX:  50 + Math.random() * 35, scatterY: -75 - Math.random() * 25, rot: (Math.random() - 0.5) * 3.2, snapped: false },
      { id: 'coreDisc',     targetX: 0,        targetY: -r * 0.02, scatterX: -45 - Math.random() * 30, scatterY:  65 + Math.random() * 25, rot: (Math.random() - 0.5) * 3.5, snapped: false },
      { id: 'collar',       targetX: 0,        targetY: -r * 0.16, scatterX:   0 + (Math.random() - 0.5) * 40, scatterY: -110 - Math.random() * 25, rot: (Math.random() - 0.5) * 2.2, snapped: false }
    ];

    if (typeof spawnFloatingText === 'function') {
      spawnFloatingText(this.x, this.y - this.r - 28, "REBOOTING...", "#FF8800");
    }
  }

  update(opponent, ownerIndex, arena) {
    if (this.hitFlashTimer > 0) this.hitFlashTimer--;

    // Self-Destruct Post-Explosion Breather Recovery Phase
    if (this.isSelfDestructRecovering) {
      this.selfDestructRecoveryTimer--;
      this.vx = 0;
      this.vy = 0;

      // Smooth facing rotation alignment toward opponent during final frames of reassembly
      if (opponent && opponent.hp > 0 && this.selfDestructRecoveryTimer <= 35) {
        const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        let currentAngle = this.gunAngle || this.angle || 0;
        let diff = targetAngle - currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const turnSpeed = 0.12; // Smooth natural turn interpolation
        const newAngle = currentAngle + diff * turnSpeed;
        this.gunAngle = newAngle;
        this.angle = newAngle;
      }

      // Spawn cooling smoke & thermal sparks during breather pause
      if (this.selfDestructRecoveryTimer % 3 === 0) {
        if (typeof spawnLaserSmoke === 'function') {
          spawnLaserSmoke(this.x + (Math.random() - 0.5) * 16, this.y + (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5);
        }
        if (typeof spawnSparks === 'function' && Math.random() < 0.5) {
          spawnSparks(this.x, this.y, 2, 'laserHit');
        }
      }

      if (this.selfDestructRecoveryTimer <= 0) {
        if (this.hp > 0 && !this.isDead) {
          this.isSelfDestructRecovering = false;
          this.shatteredPieces = null; // Reassembly piece-by-piece complete! Whole model restored!
          this.rebootAccelTimer = 22; // Smooth 22-frame acceleration ramp-up so movement doesn't snap!

          // ── FULL RESET OF MOVEMENT & SKILLS UPON BODY REASSEMBLY ──
          this.interruptAttacks(true); // Stop active audio handles & attack states
          this.vx = 0;
          this.vy = 0;
          this.isDashing = false;
          this.isFlurrying = false;
          this.flurryHitsLeft = 0;
          this.flurryTarget = null;
          this.isChargingUlt = false;
          this.isFiringUlt = false;
          this.isUltRecovering = false;
          this.ultTimer = 0;
          this.isSelfDestructing = false;
          this.speedBoostTimer = 0;

          // Reset all skill & attack cooldowns to 0 so all skills are ready!
          this.shootCooldown = 0;
          this.flurryCooldown = 0;
          this.dashCooldown = 0;
          this.ultCooldown = 0;
          this.meleeDashDelayTimer = 0;

          // Restore Ranged Mode stance with 100% full Heat Ammo
          this.isMeleeStance = false;
          this.heatAmmo = this.maxHeatAmmo || 20;
          this.ammoReloadTimer = 0;
          this.meleeDashCount = 0;

          // Clean motion trails & ghosts
          if (this.afterImages) this.afterImages.length = 0;
          if (this.rocketFlameTrail) this.rocketFlameTrail.length = 0;

        this._healthBarHealTimer = 28;
        if (typeof spawnImpactFlash === 'function') {
          spawnImpactFlash(this.x, this.y, 45, '#00E5FF');
        }
        if (typeof spawnFloatingText === 'function') {
          spawnFloatingText(this.x, this.y - this.r - 24, "SYSTEMS REBOOTED!", "#00FFDD");
        }
        }
      }
      return; // Stop movement & attacks during breather recovery!
    }

    // Core Self-Destruct Stasis Countdown
    if (this.isSelfDestructing) {
      if (this.hp <= 0 || this.isDead) {
        this.isSelfDestructing = false;
        this.usedSelfDestruct = true;
        return;
      }
      this.selfDestructTimer--;
      this.vx = 0;
      this.vy = 0;

      // High-frequency cyan core overload discharges & electrical sparks
      if (this.selfDestructTimer % 2 === 0) {
        if (typeof spawnSparks === 'function') {
          spawnSparks(this.x, this.y, 3, 'flash_layla', '#00FFFF');
        }
        if (typeof spawnMeleeClashShockwave === 'function' && this.selfDestructTimer % 10 === 0) {
          spawnMeleeClashShockwave(this.x, this.y, this.r * 2.5, 'gojo');
        }
      }

      if (this.selfDestructTimer <= 0) {
        this.performSelfDestructExplosion();
      }
      return;
    }

    // Incineration Cannon Ultimate Cooldown Exception: ultCooldown MUST ALWAYS tick down every frame,
    // even if Genos is paralyzed, frozen, time-stopped, or hit by Getsuga Tensho / Beams / Stun!
    if (!this.isChargingUlt && !this.isFiringUlt && (this.ultCooldown || 0) > 0) {
      this.ultCooldown--;
    }

    // Mandatory Rule #1: TimeStop & Freeze Guard at top of update loop
    const isFrozen = this._handleTimeStop();
    if (isFrozen || this.isTargetOfAmbush) {
      this.interruptAttacks();
      return; // Stop update execution so fighter is frozen!
    }

    // Decay Cooldowns & Timers
    if (this.shootCooldown > 0) this.shootCooldown--;
    if (this.basicBlastAnimTimer > 0) this.basicBlastAnimTimer--;
    if (this.punchAnimTimer > 0) this.punchAnimTimer--;
    if (this.flurryCooldown > 0) this.flurryCooldown--;
    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.meleeDashDelayTimer > 0) this.meleeDashDelayTimer--;

    // Handle Thruster Speed Boost Decay
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer--;
      if (this.speedBoostTimer <= 0) {
        const modeMult = (typeof state !== 'undefined' && state.mode && typeof MODE_SPEED_MULTIPLIER !== 'undefined' && MODE_SPEED_MULTIPLIER[state.mode]) || 1;
        this.speed = (this.baseSpeed || 5.2) * modeMult;
      }
    }

    // Continuous directional rocket thruster sparks & ghost flame trail steps while thruster boost is active
    if (this.speedBoostTimer > 0) {
      const spd = Math.hypot(this.vx, this.vy);
      if (spd > 0.5) {
        if (!this.rocketFlameTrail) this.rocketFlameTrail = [];
        this.rocketFlameTrail.push({
          x: this.x,
          y: this.y,
          vx: this.vx,
          vy: this.vy,
          r: this.r,
          timer: 10,
          maxTimer: 10
        });

        // Spawn dense ghost body after-images every frame for a closely-packed trail
        if (!this.afterImages) this.afterImages = [];
        pushTrailCap(this.afterImages, {
          x: this.x,
          y: this.y,
          r: this.r,
          vx: this.vx,
          vy: this.vy,
          gunAngle: this.gunAngle || this.angle || 0,
          timer: 10,
          maxTimer: 10,
        });

        if (this.speedBoostTimer % 2 === 0) {
          const backAngle = Math.atan2(-this.vy, -this.vx);
          const backX = this.x + Math.cos(backAngle) * (this.r + 4);
          const backY = this.y + Math.sin(backAngle) * (this.r + 4);
          if (typeof spawnSparks === 'function') {
            spawnSparks(backX, backY, 4, 'orange');
          }
        }
      }
    }

    // Handle delayed Machine Gun Blows voice audio
    if (this.flurryVoiceTimer > 0) {
      this.flurryVoiceTimer--;
      if (this.flurryVoiceTimer === 0) {
        const flurrySrc = CONFIG.genos?.flurryVoiceSound || 'Assets/Sound Effects/Skills/genos-machinegunblow-voice.mp3';
        const flurryVol = CONFIG.genos?.flurryVoiceVolume ?? 2.5;
        audioSystem.playSFX(flurrySrc, flurryVol);
      }
    }

    if (this.dashSoundCooldownTimer > 0) {
      this.dashSoundCooldownTimer--;
    }

    if (this._flurryHitConnectedTimer > 0) {
      this._flurryHitConnectedTimer--;
    }

    if (this._basicHitConnectedTimer > 0) {
      this._basicHitConnectedTimer--;
    }

    // Decay ghost body after-images EVERY frame
    if (this.afterImages && this.afterImages.length > 0) {
      for (let i = this.afterImages.length - 1; i >= 0; i--) {
        this.afterImages[i].timer--;
        if (this.afterImages[i].timer <= 0) {
          this.afterImages.splice(i, 1);
        }
      }
    }

    // Decay rocket flame trail steps
    if (this.rocketFlameTrail && this.rocketFlameTrail.length > 0) {
      for (let i = this.rocketFlameTrail.length - 1; i >= 0; i--) {
        this.rocketFlameTrail[i].timer--;
        if (this.rocketFlameTrail[i].timer <= 0) {
          this.rocketFlameTrail.splice(i, 1);
        }
      }
    }

    // 1. Ultimate Wind-up & Beam Tick Update
    if (this.isChargingUlt) {
      this.ultTimer--;
      this.vx = 0;
      this.vy = 0;

      // Optional windup channeling shake (disabled by default when ultWindupShakeIntensity = 0)
      const windupShake = CONFIG.genos?.ultWindupShakeIntensity || 0;
      if (windupShake > 0) {
        triggerGlobalScreenShake(windupShake, CONFIG.genos?.ultWindupShakeDuration || 4);
      }

      // Smoothly track opponent position with heavy cannon turn speed during wind-up charge frames (no instant snapping)
      if (opponent && opponent.hp > 0) {
        const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        let diff = targetAngle - this.ultAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        const maxTurnSpeed = 0.035; // ~2 degrees per frame smooth heavy cannon turn rate
        this.ultAngle += Math.max(-maxTurnSpeed, Math.min(maxTurnSpeed, diff));
      }
      this.gunAngle = this.ultAngle;
      this.angle = this.ultAngle;

      if (this.ultTimer <= 0) {
        this.isChargingUlt = false;
        this.isFiringUlt = true;
        this.ultTimer = CONFIG.genos?.ultDurationFrames || 120;
        const blastShake = CONFIG.genos?.ultBlastShakeIntensity ?? 6.0;
        if (blastShake > 0) {
          triggerGlobalScreenShake(blastShake, CONFIG.genos?.ultBlastShakeDuration || 12);
        }
        if (CONFIG.genos?.ultBlastEnabled !== false) {
          const blastSrc = CONFIG.genos?.ultBlastSound || 'Assets/Sound Effects/Skills/genos-incenerate-blast.mp3';
          const blastVol = CONFIG.genos?.ultBlastVolume ?? 2.0;
          audioSystem.playSFX(blastSrc, blastVol);
        }
      }
      return;
    }

    if (this.isFiringUlt) {
      this.ultTimer--;
      this.vx = 0;
      this.vy = 0;
      // Lock facing angle during beam fire (no rotating)
      this.gunAngle = this.ultAngle;
      this.angle = this.ultAngle;

      // Configurable beam blast loop screen shake
      const firingShake = CONFIG.genos?.ultFiringShakeIntensity ?? 2.5;
      if (firingShake > 0) {
        triggerGlobalScreenShake(firingShake, CONFIG.genos?.ultFiringShakeDuration || 4);
      }

      const range = CONFIG.genos?.ultBeamRange || 1200;
      const width = CONFIG.genos?.ultBeamWidth || 70;

      const targetsToScan = [];
      if (state.fighters) {
        state.fighters.forEach(f => {
          if (f && f !== this && f.hp > 0) {
            targetsToScan.push(f);
            if (f.rika && f.rika.active && !f.rika.isDying && f.rika.hp > 0 && !targetsToScan.includes(f.rika)) {
              targetsToScan.push(f.rika);
            }
          }
        });
      }
      if (state.illusions) {
        state.illusions.forEach(ill => {
          if (ill && ill.hp > 0 && !targetsToScan.includes(ill)) {
            targetsToScan.push(ill);
          }
        });
      }

      // ── Per-Frame Beam Pin & Axis Center Lock ──
      // Prevents targets caught in beam from rebouncing off arena walls or bouncing sideways
      for (const target of targetsToScan) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const projDist = dx * Math.cos(this.ultAngle) + dy * Math.sin(this.ultAngle);
        const perpDist = Math.abs(-dx * Math.sin(this.ultAngle) + dy * Math.cos(this.ultAngle));

        if (projDist >= 0 && projDist <= range && perpDist <= width / 2 + target.r && !target.isBaguvixActive && !target.isGodModeActive) {
          // Continuous beam trap lock: suppresses wall bounce reflection & angle jitter
          target.caughtInGenosBeamTimer = 10;

          // Gently align target to the beam's central axis line (soft pull allows targets to move/steer)
          const pullStrength = CONFIG.genos?.ultBeamCenterPull ?? 0.04;
          const centerProjX = this.x + Math.cos(this.ultAngle) * projDist;
          const centerProjY = this.y + Math.sin(this.ultAngle) * projDist;
          target.x += (centerProjX - target.x) * pullStrength;
          target.y += (centerProjY - target.y) * pullStrength;
        }
      }

      // Damage Ticks every 6 frames
      if (this.ultTimer % (CONFIG.genos?.ultTickInterval || 6) === 0) {
        const damage = CONFIG.genos?.ultDamagePerTick || 10;

        for (const target of targetsToScan) {
          const dx = target.x - this.x;
          const dy = target.y - this.y;
          const projDist = dx * Math.cos(this.ultAngle) + dy * Math.sin(this.ultAngle);
          const perpDist = Math.abs(-dx * Math.sin(this.ultAngle) + dy * Math.cos(this.ultAngle));

          if (projDist >= 0 && projDist <= range && perpDist <= width / 2 + target.r) {
            applyDamageToTarget(target, damage, this, { isSkill: true, isUltimate: true, isGenosBeam: true });
            
            // 1. Controlled Directional Incineration Beam Push (blends with user movement velocity)
            const pushForce = CONFIG.genos?.ultKnockbackForce || 8;
            const pushVx = Math.cos(this.ultAngle) * pushForce;
            const pushVy = Math.sin(this.ultAngle) * pushForce;
            target.vx = target.vx * 0.4 + pushVx;
            target.vy = target.vy * 0.4 + pushVy;

            // 2. Impact Flash & Laser Hit Sparks on Target
            if (typeof spawnSparks === 'function') {
              spawnSparks(target.x, target.y, 5, 'laserHit');
            }
            if (typeof spawnImpactFlash === 'function') {
              spawnImpactFlash(target.x, target.y, 22);
            }
          }
        }

        // Clear projectiles in beam path
        if (state.projectiles) {
          for (let i = state.projectiles.length - 1; i >= 0; i--) {
            const p = state.projectiles[i];
            if (!p) continue;
            const dx = p.x - this.x;
            const dy = p.y - this.y;
            const projDist = dx * Math.cos(this.ultAngle) + dy * Math.sin(this.ultAngle);
            const perpDist = Math.abs(-dx * Math.sin(this.ultAngle) + dy * Math.cos(this.ultAngle));
            if (projDist >= 0 && projDist <= range && perpDist <= width / 2) {
              state.projectiles.splice(i, 1);
            }
          }
        }
      }

      if (this.ultTimer <= 0) {
        this.isFiringUlt = false;
        this.isUltRecovering = true;
        this.ultRecoveryTimer = CONFIG.genos?.ultRecoveryFrames || 45; // ~0.75 seconds of recovery (repositioning hands & smoking)
        if (CONFIG.genos?.ultRecoveryEnabled !== false) {
          const recSrc = CONFIG.genos?.ultRecoverySound || 'Assets/Sound Effects/Skills/genos-recovery.mp3';
          const recVol = CONFIG.genos?.ultRecoveryVolume ?? 1.5;
          audioSystem.playSFX(recSrc, recVol);
        }
      }
      return;
    }

    // 1b. Ultimate Post-Beam Recovery & Smoke Cooling Phase
    if (this.isUltRecovering) {
      this.ultRecoveryTimer--;
      this.vx = 0;
      this.vy = 0;
      this.gunAngle = this.ultAngle;
      this.angle = this.ultAngle;

      // Spawn laser smoke & hot mechanical sparks from hand nozzles every 2 frames
      if (this.ultRecoveryTimer % 2 === 0) {
        const nozzleDist = this.r + 30;
        const muzzleX = this.x + Math.cos(this.ultAngle) * nozzleDist;
        const muzzleY = this.y + Math.sin(this.ultAngle) * nozzleDist;
        
        const smokeVx = Math.cos(this.ultAngle) * (1.5 + Math.random() * 2) + (Math.random() - 0.5) * 1.5;
        const smokeVy = Math.sin(this.ultAngle) * (1.5 + Math.random() * 2) + (Math.random() - 0.5) * 1.5;
        
        if (typeof spawnLaserSmoke === 'function') {
          spawnLaserSmoke(muzzleX + (Math.random() - 0.5) * 12, muzzleY + (Math.random() - 0.5) * 12, smokeVx, smokeVy);
        }
        if (typeof spawnSparks === 'function' && Math.random() < 0.4) {
          spawnSparks(muzzleX, muzzleY, 2, 'laserHit');
        }
      }

      if (this.ultRecoveryTimer <= 0) {
        this.isUltRecovering = false;
        this.isDashing = false;
        this.isMeleeStance = false;
        this.isMeleeDashNext = false;
        this.meleeDashCount = 0;
        this.speedBoostTimer = 0;
        this._justEnteredMeleeStance = false;
        
        const modeMult = (typeof state !== 'undefined' && state.mode && typeof MODE_SPEED_MULTIPLIER !== 'undefined' && MODE_SPEED_MULTIPLIER[state.mode]) || 1;
        this.speed = (this.baseSpeed || 5.2) * modeMult;

        if (opponent && opponent.hp > 0) {
          const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y) || 1;
          this.vx = ((opponent.x - this.x) / dist) * this.speed;
          this.vy = ((opponent.y - this.y) / dist) * this.speed;
        } else {
          const moveAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);
          this.vx = Math.cos(moveAngle) * this.speed;
          this.vy = Math.sin(moveAngle) * this.speed;
        }

        this._lastWallBounceFrame = (typeof state !== 'undefined' && state.frameCount) ? state.frameCount : Date.now();
        this.dashCooldown = Math.max(this.dashCooldown || 0, CONFIG.genos?.postUltDashCooldown || 60);
        this.flurryCooldown = Math.max(this.flurryCooldown || 0, CONFIG.genos?.postUltFlurryCooldown || 60);
      }
      return;
    }

    // 2. Skill 2: Rocket Stomp Update (if active)
    if (this.isDashing) {
      this.isDashing = false;
      this.performStompExplosion();
      return;
    }

    // 3. Skill 1: Machine Gun Blows Flurry Update
    if (this.isFlurrying) {
      const currentTarget = (this.flurryTarget && this.flurryTarget.hp > 0) ? this.flurryTarget : opponent;
      if (currentTarget && currentTarget.hp > 0) {
        this.aim(currentTarget);
      }

      this.flurryTimer++;

      const reach = CONFIG.genos?.flurryReach || 70;
      const damage = CONFIG.genos?.flurryDamage || 10;
      const halfArc = (CONFIG.genos?.flurryArcAngle || Math.PI * 0.5) / 2;
      const aimAngle = this.gunAngle !== undefined ? this.gunAngle : (this.angle || 0);

      const targetsToScan = [];
      if (state.fighters) {
        state.fighters.forEach(f => {
          if (f && f !== this && f.hp > 0) {
            targetsToScan.push(f);
            if (f.rika && f.rika.active && !f.rika.isDying && f.rika.hp > 0 && !targetsToScan.includes(f.rika)) {
              targetsToScan.push(f.rika);
            }
          }
        });
      }
      if (state.illusions) {
        state.illusions.forEach(ill => {
          if (ill && ill.hp > 0 && !targetsToScan.includes(ill)) {
            targetsToScan.push(ill);
          }
        });
      }

      // Continuously stop enemy target movement every frame during Machine Gun Blows
      for (const target of targetsToScan) {
        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        let inCone = false;
        if (dist <= this.r + reach + target.r) {
          const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
          let angleDiff = angleToTarget - aimAngle;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

          if (Math.abs(angleDiff) <= halfArc) {
            inCone = true;
            if (this.flurryHitsLeft > 0) {
              target.vx = 0;
              target.vy = 0;
              target.caughtInGenosFlurry = true;
              if (target.knockbackVx !== undefined) target.knockbackVx = 0;
              if (target.knockbackVy !== undefined) target.knockbackVy = 0;
              if (typeof target.applyTimeStop === 'function') {
                target.applyTimeStop(10, { isSkill: true });
              }
            }
          }
        }
        if (!inCone) {
          target.caughtInGenosFlurry = false;
        }
      }

      if (this.flurryTimer % 5 === 0) {
        this.triggerPunchAnimation();
        this.flurryHitsLeft--;

        const isFinalHit = this.flurryHitsLeft === 0;
        let flurryHitAny = false;

        for (const target of targetsToScan) {
          const dist = Math.hypot(target.x - this.x, target.y - this.y);
          if (dist <= this.r + reach + target.r) {
            const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);
            let angleDiff = angleToTarget - aimAngle;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            if (Math.abs(angleDiff) <= halfArc) {
              flurryHitAny = true;
              const hitDmg = isFinalHit ? damage * 2.2 : damage;
              applyDamageToTarget(target, hitDmg, this, { isSkill: true, isRanged: true, isMachineGunBlow: true });

              if (isFinalHit) {
                target.caughtInGenosFlurry = false;
                // Final hit: apply heavy finisher knockback push & extended hit-pause
                if (typeof target.applyTimeStop === 'function') {
                  target.applyTimeStop(20, { isSkill: true });
                }
                const pushForce = 18.0;
                const pushVx = Math.cos(angleToTarget) * pushForce;
                const pushVy = Math.sin(angleToTarget) * pushForce;
                if (typeof target.applyKnockback === 'function') {
                  target.applyKnockback(pushVx, pushVy);
                } else {
                  target.vx += pushVx;
                  target.vy += pushVy;
                }
              } else {
                // Non-final hits: Stop movement & freeze enemy in place so they stay pinned during Machine Gun Blows!
                target.vx = 0;
                target.vy = 0;
                target.caughtInGenosFlurry = true;
                if (target.knockbackVx !== undefined) target.knockbackVx = 0;
                if (target.knockbackVy !== undefined) target.knockbackVy = 0;
                if (typeof target.applyTimeStop === 'function') {
                  target.applyTimeStop(12, { isSkill: true });
                }
              }

              // Supersonic wind blast speed lines on impact
              if (typeof spawnPunchWindSpeedLines === 'function') {
                spawnPunchWindSpeedLines(target.x, target.y, angleToTarget, isFinalHit ? 240 : 160, 'orange');
              }
              // Spiky anime impact crescent + shockwave ring — Genos fiery orange theme
              if (typeof spawnAnimePunchImpactFrame === 'function') {
                spawnAnimePunchImpactFrame(target.x, target.y, isFinalHit ? 85 : 62, angleToTarget, 'orange');
              }
              if (typeof spawnMeleeClashShockwave === 'function') {
                spawnMeleeClashShockwave(target.x, target.y, isFinalHit ? 90 : 65, 'genos');
              }
              if (typeof spawnImpactFlash === 'function') {
                spawnImpactFlash(target.x, target.y, isFinalHit ? 45 : 30, '#FF5500');
              }
              if (typeof spawnSparks === 'function') {
                spawnSparks(target.x, target.y, isFinalHit ? 14 : 7, 'orange');
              }
            }
          }
        }

        // Spawn screen shake, arm wind lines & hand aura ONLY when punches actually connect with a target
        if (flurryHitAny) {
          this._flurryHitConnectedTimer = 10;
          if (typeof triggerGlobalScreenShake === 'function') {
            triggerGlobalScreenShake(isFinalHit ? 3.2 : 1.5, isFinalHit ? 16 : 8);
          }
          if (typeof spawnPunchWindSpeedLines === 'function') {
            spawnPunchWindSpeedLines(this.x, this.y, aimAngle, 180, 'orange');
          }
        }

        audioSystem.playSFX('Assets/Sound Effects/Attacks/punch.mp3', 1.0);
      }

      if (this.flurryHitsLeft <= 0) {
        this.isFlurrying = false;
        if (this.flurryTarget) {
          this.flurryTarget.caughtInGenosFlurry = false;
        }
        if (typeof state !== 'undefined') {
          if (state.fighters) state.fighters.forEach(f => { if (f) f.caughtInGenosFlurry = false; });
          if (state.illusions) state.illusions.forEach(ill => { if (ill) ill.caughtInGenosFlurry = false; });
        }
        this.flurryTarget = null;
      }
      return;
    }

    // ── MELEE MODE ALTERNATING CADENCE: DASH -- REBOUNCE -- DASH -- REBOUNCE ──
    const canAct = !this.hitStunTimer || this.hitStunTimer <= 0;
    if (canAct && opponent && opponent.hp > 0 && this.isMeleeStance && !this.isDashing && !this.isFlurrying && !this.isChargingUlt && !this.isFiringUlt && !this.isUltRecovering) {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);
      const meleeReach = this.r + (opponent.r || 25) + 30; // ~75-85px melee punch range

      if (dist > meleeReach) {
        const activeArena = arena || CONFIG.arena;
        const eps = 6.0;
        const wallBounced = activeArena ? (
          (this.x - this.r <= activeArena.x + eps) ||
          (this.x + this.r >= activeArena.x + activeArena.width - eps) ||
          (this.y - this.r <= activeArena.y + eps) ||
          (this.y + this.r >= activeArena.y + activeArena.height - eps)
        ) : false;

        const currentFrame = (typeof state !== 'undefined' && state.frameCount) ? state.frameCount : Date.now();
        const canTriggerWallBounce = (currentFrame - (this._lastWallBounceFrame || 0)) > 12;

        if (this._justEnteredMeleeStance || (wallBounced && canTriggerWallBounce)) {
          this._lastWallBounceFrame = currentFrame;

          const maxDashes = CONFIG.genos?.maxMeleeDashes || 10;
          if ((this._justEnteredMeleeStance || this.isMeleeDashNext) && (this.meleeDashCount || 0) < maxDashes) {
            // ── DASH PHASE: Launch explosive high-speed thruster dash burst towards enemy ──
            this.meleeDashCount = (this.meleeDashCount || 0) + 1;
            this._justEnteredMeleeStance = false;
            this.isMeleeDashNext = false; // Next wall impact will be a REBOUNCE!
            this.isDashing = true;

            const dirX = (opponent.x - this.x) / dist;
            const dirY = (opponent.y - this.y) / dist;
            
            // Boost this.speed during melee thruster dash
            const modeMult = (typeof state !== 'undefined' && state.mode && typeof MODE_SPEED_MULTIPLIER !== 'undefined' && MODE_SPEED_MULTIPLIER[state.mode]) || 1;
            const baseSpd = this.baseSpeed || 5.2;
            const speedMult = CONFIG.genos?.dashes?.meleeThrusterDash?.speedMultiplier ?? 3.4;
            this.speed = baseSpd * modeMult * speedMult;
            this.speedBoostTimer = CONFIG.genos?.dashes?.meleeThrusterDash?.durationFrames ?? 18;

            this.vx = dirX * this.speed;
            this.vy = dirY * this.speed;

            if (CONFIG.genos?.dashSoundEnabled !== false && this.dashSoundCooldownTimer <= 0) {
              const dashSrc = CONFIG.genos?.dashSound || 'Assets/Sound Effects/Skills/genos-dash-noise.mp3';
              const dashVol = CONFIG.genos?.dashSoundVolume ?? 1.8;
              audioSystem.playSFX(dashSrc, dashVol);
              this.dashSoundCooldownTimer = CONFIG.genos?.dashSoundCooldownFrames ?? 180;
            } else {
              audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.9);
            }
            if (typeof spawnGenosThrusterDashVisual === 'function') {
              spawnGenosThrusterDashVisual(this.x, this.y, Math.atan2(dirY, dirX));
            } else if (typeof spawnSparks === 'function') {
              const backX = this.x - dirX * (this.r + 5);
              const backY = this.y - dirY * (this.r + 5);
              spawnSparks(backX, backY, 8, 'orange');
            }
          } else {
            // ── REBOUNCE / MAX DASH LIMIT REACHED PHASE ──
            if ((this.meleeDashCount || 0) < maxDashes) {
              this.isMeleeDashNext = true; // Next wall impact will be a DASH!
            } else {
              this.isMeleeDashNext = false; // Cap of 5 dashes reached! No more thruster dashes in this Melee Mode instance.
              this._justEnteredMeleeStance = false;
            }
            this.speedBoostTimer = 0;
            this.isDashing = false;
            const modeMult = (typeof state !== 'undefined' && state.mode && typeof MODE_SPEED_MULTIPLIER !== 'undefined' && MODE_SPEED_MULTIPLIER[state.mode]) || 1;
            this.speed = (this.baseSpeed || 5.2) * modeMult;

            if (typeof spawnImpactFlash === 'function') {
              spawnImpactFlash(this.x, this.y, 25, '#FF8800');
            }
            if (typeof spawnSparks === 'function') {
              spawnSparks(this.x, this.y, 6, 'orange');
            }
          }
        }
      }
    }

    // Call base physics & movement (handles position update & arena wall rebounce!)
    super.update(opponent, ownerIndex, arena);

    // ── Movement-driven body rotation ──
    // Smoothly lerp bodyRotAngle toward the current velocity direction when moving
    const moveMag = Math.hypot(this.vx, this.vy);
    if (moveMag > 0.8) {
      const targetRot = Math.atan2(this.vy, this.vx);
      // Shortest-path angle lerp
      let delta = targetRot - this.bodyRotAngle;
      while (delta >  Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      this.bodyRotAngle += delta * 0.18;
    }

    // Reload Cooldown & Stance Switch back to Ranged Mode
    if (this.isMeleeStance) {
      if (this.ammoReloadTimer > 0) {
        this.ammoReloadTimer--;
        if (this.ammoReloadTimer <= 0) {
          this.isMeleeStance = false;
          this.meleeDashCount = 0;
          this.heatAmmo = this.maxHeatAmmo;
          if (typeof spawnFloatingText === 'function') {
            spawnFloatingText(this.x, this.y - this.r - 28, "RANGED READY", "#00FFDD");
          }
        }
      }
    }

    // Apply rebootAccelTimer smooth acceleration ramp-up post-reassembly so movement doesn't snap
    if (this.rebootAccelTimer > 0) {
      const accelFactor = (22 - this.rebootAccelTimer) / 22;
      this.vx *= accelFactor;
      this.vy *= accelFactor;
      this.rebootAccelTimer--;
    }

    // AI & Combat Target Aiming: Continuously track target angle every frame with smooth easing post-reassembly
    if (canAct && opponent && opponent.hp > 0 && !this.isChargingUlt && !this.isFiringUlt && !this.isUltRecovering) {
      if (this.rebootAccelTimer > 0) {
        const targetAngle = Math.atan2(opponent.y - this.y, opponent.x - this.x);
        let currentAngle = this.gunAngle || this.angle || 0;
        let diff = targetAngle - currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        const turnRate = 0.15; // Smooth natural turn rate
        const newAngle = currentAngle + diff * turnRate;
        this.gunAngle = newAngle;
        this.angle = newAngle;
      } else {
        this.aim(opponent);
      }
    }

    if (canAct && opponent && opponent.hp > 0 && !this.isChargingUlt && !this.isFiringUlt && !this.isUltRecovering) {
      const dist = Math.hypot(opponent.x - this.x, opponent.y - this.y);

      // Skill 1 Priority: Machine Gun Blows (FIRST priority when available!)
      const flurryTriggerRange = CONFIG.genos?.flurryTriggerRange || 280;
      const ultMinRange = CONFIG.genos?.ultTriggerMinRange || 180;
      const ultMaxRange = CONFIG.genos?.ultTriggerMaxRange || 450;
      const stompTriggerRange = CONFIG.genos?.dashes?.rocketDash?.triggerRange ?? CONFIG.genos?.stompRadius ?? 120;
      const punchReach = CONFIG.genos?.meleePunchReach || 65;
      const blastRange = CONFIG.genos?.blastRange || 350;

      if (this.flurryCooldown <= 0 && dist <= flurryTriggerRange) {
        this.executeMachineGunBlows(opponent);
      }
      // Ultimate Priority: Medium range
      else if (this.ultCooldown <= 0 && dist >= ultMinRange && dist <= ultMaxRange) {
        this.executeSpiralIncinerationCannon(opponent);
      }
      // Skill 2 Priority: Rocket Stomp
      else if (this.dashCooldown <= 0 && dist <= stompTriggerRange) {
        this.executeRocketStomp(opponent);
      }
      // Basic Attack: Range
      else {
        const maxRange = this.isMeleeStance ? (this.r + punchReach + 20) : blastRange;
        if (dist <= maxRange && (this.shootCooldown <= 0 || !this.shootCooldown)) {
          this.executeBasicBlast(opponent);
        }
      }
    }
  }
}
