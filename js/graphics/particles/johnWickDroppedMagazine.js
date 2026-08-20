// ─────────────────────────────────────────────
// John Wick Dropped Magazine & Thrown Gun Physics & Debris Entity
// Spawns empty TTI Pit Viper magazines and thrown weapons that tumble across the arena
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { CONFIG } from '../../core/config.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { drawJohnWickPistol, drawJohnWickShotgun, drawJohnWickRifle } from '../weapons/johnWickWeaponGraphics.js';

// Pre-allocated arrays for active debris in the arena
if (typeof state !== 'undefined') {
  if (!state.droppedMagazines) state.droppedMagazines = [];
  if (!state.thrownGuns) state.thrownGuns = [];
  if (!state.spentCasings) state.spentCasings = [];
}

/**
 * Spawns an empty dropped magazine at the magwell base of John Wick's firearm (Pistol or M4 Rifle)
 */
export function spawnDroppedMagazine(fighterX, fighterY, gunAngle = 0, weaponType = 'pistol', r = 25) {
  if (typeof state === 'undefined') return;
  if (!state.droppedMagazines) state.droppedMagazines = [];

  const MAX_MAGAZINES = 8;
  if (state.droppedMagazines.length >= MAX_MAGAZINES) {
    state.droppedMagazines.shift();
  }

  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  const cosA = Math.cos(gunAngle);
  const sinA = Math.sin(gunAngle);
  const perpX = -sinA;
  const perpY = cosA;

  const defaultWeaponScale = 1.25;
  const isRifle = weaponType === 'rifle';
  const localMagX = (isRifle ? (r * 0.85 + 4) : (r * 0.85 - 5)) * 1.0;
  const localMagY = (facingLeft ? (isRifle ? -12 : -15) : (isRifle ? 12 : 15)) * defaultWeaponScale;

  const spawnX = fighterX + cosA * localMagX + perpX * localMagY;
  const spawnY = fighterY + sinA * localMagX + perpY * localMagY;

  const ejectAngle = gunAngle + (facingLeft ? -Math.PI / 2 : Math.PI / 2);
  const ejectSpeed = isRifle ? (2.2 + Math.random() * 1.0) : (1.8 + Math.random() * 1.2);

  state.droppedMagazines.push({
    x: spawnX,
    y: spawnY,
    vx: Math.cos(ejectAngle) * ejectSpeed + (Math.random() - 0.5) * 0.8,
    vy: Math.sin(ejectAngle) * ejectSpeed + 1.5,
    rot: gunAngle + (Math.random() - 0.5) * 0.4,
    vRot: (Math.random() - 0.5) * (isRifle ? 0.16 : 0.22),
    weaponType: isRifle ? 'rifle' : 'pistol',
    onGround: false,
    bounceCount: 0,
    life: 1.0,
    decay: 0.0035,
    width: isRifle ? 9.0 : 6.5,
    height: isRifle ? 22.0 : 14.0
  });
}

/**
 * Spawns a physical thrown firearm (TTI Pit Viper or Benelli M4) that arcs and tumbles through the air
 */
export function spawnThrownGun(fighterX, fighterY, gunAngle = 0, weaponType = 'pistol', r = 25) {
  if (typeof state === 'undefined') return;
  if (!state.thrownGuns) state.thrownGuns = [];

  const MAX_THROWN_GUNS = 8;
  if (state.thrownGuns.length >= MAX_THROWN_GUNS) {
    state.thrownGuns.shift();
  }

  const cosA = Math.cos(gunAngle);
  const sinA = Math.sin(gunAngle);
  const spawnX = fighterX + cosA * (r + 12);
  const spawnY = fighterY + sinA * (r + 12);

  // Thrown forward and slightly upward in an arc
  const throwSpeed = weaponType === 'shotgun' ? 10.5 : 13.5;
  const throwVx = cosA * throwSpeed + (Math.random() - 0.5) * 1.5;
  const throwVy = sinA * throwSpeed - 4.5;
  const spinSpeed = (Math.random() > 0.5 ? 1 : -1) * (0.24 + Math.random() * 0.12);

  state.thrownGuns.push({
    x: spawnX,
    y: spawnY,
    vx: throwVx,
    vy: throwVy,
    rot: gunAngle,
    vRot: spinSpeed,
    weaponType: weaponType,
    onGround: false,
    bounceCount: 0,
    life: 1.0,
    decay: 0.0040 // ~4.0s on the floor
  });
}

/**
 * Spawns a physical spent shell casing flying out of the ejection port (9mm, 12-gauge, or 5.56 NATO)
 * and dropping to the bottom floor of the arena with full bounce and settling physics.
 */
export function spawnSpentCasing(fighterX, fighterY, gunAngle = 0, casingType = '556', r = 25) {
  if (typeof state === 'undefined') return;
  if (!state.spentCasings) state.spentCasings = [];

  const MAX_CASINGS = 35;
  if (state.spentCasings.length >= MAX_CASINGS) {
    state.spentCasings.shift();
  }

  const facingLeft = Math.abs(gunAngle) > Math.PI / 2;
  const cosA = Math.cos(gunAngle);
  const sinA = Math.sin(gunAngle);
  const perpX = -sinA;
  const perpY = cosA;

  const defaultWeaponScale = 1.18;
  let localEjectX = r * 0.85;
  let localEjectY = facingLeft ? 5 : -5;

  if (casingType === '556') {
    localEjectX = r * 0.85 + 2 * defaultWeaponScale;
    localEjectY = (facingLeft ? 5 : -5) * defaultWeaponScale;
  } else if (casingType === '12gauge') {
    localEjectX = r * 0.85 + 8 * defaultWeaponScale;
    localEjectY = (facingLeft ? 4 : -4) * defaultWeaponScale;
  } else {
    localEjectX = r * 0.85 + 4 * defaultWeaponScale;
    localEjectY = (facingLeft ? 5 : -5) * defaultWeaponScale;
  }

  const spawnX = fighterX + cosA * localEjectX + perpX * localEjectY;
  const spawnY = fighterY + sinA * localEjectX + perpY * localEjectY;

  // Eject upwards and backward/rightward relative to gun facing
  const ejectAngle = gunAngle + (facingLeft ? Math.PI * 0.62 : -Math.PI * 0.62) + (Math.random() - 0.5) * 0.35;
  const ejectSpeed = casingType === '556' ? (3.8 + Math.random() * 2.2) : (casingType === '12gauge' ? (4.2 + Math.random() * 2.5) : (3.2 + Math.random() * 1.8));

  state.spentCasings.push({
    x: spawnX,
    y: spawnY,
    vx: Math.cos(ejectAngle) * ejectSpeed + (Math.random() - 0.5) * 0.9,
    vy: Math.sin(ejectAngle) * ejectSpeed - 3.2 - Math.random() * 2.0,
    rot: Math.random() * Math.PI * 2,
    vRot: (Math.random() > 0.5 ? 1 : -1) * (0.35 + Math.random() * 0.25),
    casingType: casingType,
    onGround: false,
    bounceCount: 0,
    life: 1.0,
    decay: 0.0022 // Lingers ~7.5s on the floor
  });
}

/**
 * Updates physics for all dropped magazines and thrown weapons with gravity, floor bounce, and friction
 */
export function updateDroppedMagazines() {
  if (typeof state === 'undefined') return;

  const arena = CONFIG.arena;
  const wallW = (arena && arena.wallWidth) || 4;
  const arenaBottom = (arena ? arena.y + arena.height : 800) - wallW - 3;
  const arenaLeft = (arena ? arena.x : 0) + wallW + 5;
  const arenaRight = (arena ? arena.x + arena.width : 1200) - wallW - 5;
  const gravity = 0.45;

  // 1. Update Dropped Magazines
  if (state.droppedMagazines && state.droppedMagazines.length > 0) {
    for (let i = state.droppedMagazines.length - 1; i >= 0; i--) {
      const mag = state.droppedMagazines[i];
      if (!mag.onGround) {
        mag.vx *= 0.98;
        mag.vy *= 0.98;
        mag.vy += gravity;
        mag.x += mag.vx;
        mag.y += mag.vy;
        mag.rot += mag.vRot;

        if (mag.x <= arenaLeft) {
          mag.x = arenaLeft;
          mag.vx = Math.abs(mag.vx) * 0.5;
          mag.vRot = -mag.vRot * 0.6;
        } else if (mag.x >= arenaRight) {
          mag.x = arenaRight;
          mag.vx = -Math.abs(mag.vx) * 0.5;
          mag.vRot = -mag.vRot * 0.6;
        }

        if (mag.y >= arenaBottom) {
          mag.y = arenaBottom;
          mag.bounceCount++;
          if (mag.bounceCount < 3 && Math.abs(mag.vy) > 1.2) {
            mag.vy = -mag.vy * 0.35;
            mag.vx *= 0.75;
            mag.vRot *= 0.6;
          } else {
            mag.onGround = true;
            mag.vy = 0;
            mag.vx *= 0.5;
            mag.vRot = 0;
            const nearestFlat = Math.round(mag.rot / Math.PI) * Math.PI;
            mag.rot = mag.rot * 0.4 + nearestFlat * 0.6;
          }
        }
      } else {
        mag.vx *= 0.85;
        mag.x += mag.vx;
        mag.life -= mag.decay;
        if (mag.life <= 0) {
          state.droppedMagazines.splice(i, 1);
        }
      }
    }
  }

  // 2. Update Thrown Guns
  if (state.thrownGuns && state.thrownGuns.length > 0) {
    for (let i = state.thrownGuns.length - 1; i >= 0; i--) {
      const gun = state.thrownGuns[i];
      if (!gun.onGround) {
        gun.vx *= 0.985;
        gun.vy *= 0.985;
        gun.vy += gravity * 1.1;
        gun.x += gun.vx;
        gun.y += gun.vy;
        gun.rot += gun.vRot;

        if (gun.x <= arenaLeft) {
          gun.x = arenaLeft;
          gun.vx = Math.abs(gun.vx) * 0.55;
          gun.vRot = -gun.vRot * 0.6;
        } else if (gun.x >= arenaRight) {
          gun.x = arenaRight;
          gun.vx = -Math.abs(gun.vx) * 0.55;
          gun.vRot = -gun.vRot * 0.6;
        }

        if (gun.y >= arenaBottom) {
          gun.y = arenaBottom;
          gun.bounceCount++;
          if (gun.bounceCount === 1) {
            const wCfg = (typeof CONFIG !== 'undefined' && CONFIG.john_wick) ? CONFIG.john_wick : {};
            const gunDropSfx = wCfg.sounds?.gunDrop || wCfg.gunDropSound || 'Assets/Sound Effects/Skills/johnwick-gundrop.mp3';
            const gunDropVol = wCfg.soundVolumes?.gunDrop ?? wCfg.gunDropVolume ?? 0.85;
            if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
              audioSystem.playSFX(gunDropSfx, gunDropVol);
            }
          }
          if (gun.bounceCount < 3 && Math.abs(gun.vy) > 1.5) {
            gun.vy = -gun.vy * 0.38;
            gun.vx *= 0.70;
            gun.vRot *= 0.55;
          } else {
            gun.onGround = true;
            gun.vy = 0;
            gun.vx *= 0.4;
            gun.vRot = 0;
            const nearestFlat = Math.round(gun.rot / Math.PI) * Math.PI;
            gun.rot = gun.rot * 0.35 + nearestFlat * 0.65;
          }
        }
      } else {
        gun.vx *= 0.82;
        gun.x += gun.vx;
        gun.life -= gun.decay;
        if (gun.life <= 0) {
          state.thrownGuns.splice(i, 1);
        }
      }
    }
  }

  // 3. Update Spent Casings
  if (state.spentCasings && state.spentCasings.length > 0) {
    for (let i = state.spentCasings.length - 1; i >= 0; i--) {
      const c = state.spentCasings[i];
      if (!c.onGround) {
        c.vx *= 0.98;
        c.vy *= 0.98;
        c.vy += gravity * 1.05;
        c.x += c.vx;
        c.y += c.vy;
        c.rot += c.vRot;

        if (c.x <= arenaLeft) {
          c.x = arenaLeft;
          c.vx = Math.abs(c.vx) * 0.5;
          c.vRot = -c.vRot * 0.6;
        } else if (c.x >= arenaRight) {
          c.x = arenaRight;
          c.vx = -Math.abs(c.vx) * 0.5;
          c.vRot = -c.vRot * 0.6;
        }

        if (c.y >= arenaBottom) {
          c.y = arenaBottom;
          c.bounceCount++;
          if (c.bounceCount === 1) {
            const wCfg = (typeof CONFIG !== 'undefined' && CONFIG.john_wick) ? CONFIG.john_wick : {};
            const shellDropSfx = wCfg.sounds?.shellDrop || wCfg.shellDropSound || 'Assets/Sound Effects/Skills/johnwick-bulleshell-drop.mp3';
            const shellDropVol = wCfg.soundVolumes?.shellDrop ?? wCfg.shellDropVolume ?? 0.65;
            if (typeof audioSystem !== 'undefined' && typeof audioSystem.playSFX === 'function') {
              audioSystem.playSFX(shellDropSfx, shellDropVol);
            }
          }
          if (c.bounceCount < 3 && Math.abs(c.vy) > 1.2) {
            c.vy = -c.vy * 0.40;
            c.vx *= 0.70;
            c.vRot *= 0.6;
          } else {
            c.onGround = true;
            c.vy = 0;
            c.vx *= 0.4;
            c.vRot = 0;
            const nearestFlat = Math.round(c.rot / Math.PI) * Math.PI;
            c.rot = c.rot * 0.4 + nearestFlat * 0.6;
          }
        }
      } else {
        c.vx *= 0.85;
        c.x += c.vx;
        c.life -= c.decay;
        if (c.life <= 0) {
          state.spentCasings.splice(i, 1);
        }
      }
    }
  }
}

/**
 * Renders all dropped magazines and thrown weapons onto the 2D canvas
 */
export function drawDroppedMagazines(ctx) {
  if (typeof state === 'undefined') return;

  // 1. Draw Dropped Magazines
  if (state.droppedMagazines && state.droppedMagazines.length > 0) {
    for (let i = 0; i < state.droppedMagazines.length; i++) {
      const mag = state.droppedMagazines[i];
      if (mag.life <= 0) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, mag.life));
      ctx.translate(mag.x, mag.y);
      ctx.rotate(mag.rot);

      if (mag.weaponType === 'rifle') {
        // Shadow for dropped rifle mag
        if (mag.onGround || mag.y > (CONFIG.arena.y + CONFIG.arena.height - 40)) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.beginPath();
          ctx.ellipse(0, 2, 11, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        // Curved 30-round STANAG Steel Magazine Body
        ctx.fillStyle = '#24272F';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(-4.5, -11.0);
        ctx.bezierCurveTo(-4.0, -3.0, -2.0, 5.0, 1.5, 11.5);
        ctx.lineTo(8.5, 10.0);
        ctx.bezierCurveTo(5.5, 4.0, 3.5, -3.0, 3.0, -11.0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 3 Vertical Stamped Steel Ribs (grooves & highlights)
        const ribFracs = [0.22, 0.50, 0.78];
        for (let r = 0; r < ribFracs.length; r++) {
          const frac = ribFracs[r];
          const topX = -4.5 * (1 - frac) + 3.0 * frac;
          const botX = 1.5 * (1 - frac) + 8.5 * frac;

          // Dark groove
          ctx.strokeStyle = '#0C0D10';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(topX, -10.0);
          ctx.bezierCurveTo(topX + 0.3, -3.0, botX - 0.6, 5.0, botX, 9.5);
          ctx.stroke();

          // Steel highlight
          ctx.strokeStyle = '#383D48';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(topX + 0.6, -10.0);
          ctx.bezierCurveTo(topX + 0.9, -3.0, botX - 0.2, 5.0, botX + 0.6, 9.5);
          ctx.stroke();
        }

        // Steel Floorplate at bottom
        ctx.fillStyle = '#131417';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.8;
        ctx.save();
        ctx.translate(5.0, 10.8);
        ctx.rotate(-0.18);
        ctx.beginPath();
        ctx.roundRect(-4.8, -1.0, 9.6, 2.4, 0.5);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      } else {
        // Pistol Magazine (TTI Pit Viper 9mm)
        if (mag.onGround || mag.y > (CONFIG.arena.y + CONFIG.arena.height - 40)) {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          ctx.beginPath();
          ctx.ellipse(0, 2, 8, 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = '#181A1D';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.roundRect(-3, -7, 6, 14, 0.8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#D4AF37';
        ctx.strokeStyle = '#8B6914';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.roundRect(-3.6, 5, 7.2, 3.2, 0.6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0B0C0E';
        ctx.fillRect(-2, -7.5, 4, 1.2);

        ctx.fillStyle = '#B8941E';
        ctx.beginPath();
        ctx.arc(0, -3.5, 0.65, 0, Math.PI * 2);
        ctx.arc(0, -0.5, 0.65, 0, Math.PI * 2);
        ctx.arc(0, 2.5, 0.65, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.fillRect(-2.2, -6, 0.8, 11);
      }

      ctx.restore();
    }
  }

  // 2. Draw Thrown Guns using the exact authentic weapon graphics & scale size
  if (state.thrownGuns && state.thrownGuns.length > 0) {
    for (let i = 0; i < state.thrownGuns.length; i++) {
      const gun = state.thrownGuns[i];
      if (gun.life <= 0) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, gun.life));
      ctx.translate(gun.x, gun.y);
      ctx.rotate(gun.rot);

      // Floor shadow
      if (gun.onGround || gun.y > (CONFIG.arena.y + CONFIG.arena.height - 45)) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        const shadowR = gun.weaponType === 'shotgun' ? 24 : (gun.weaponType === 'rifle' ? 22 : 14);
        ctx.ellipse(0, 5, shadowR, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw the authentic weapon models at exact 1:1 scale size, centered on physical center of mass
      if (gun.weaponType === 'shotgun') {
        ctx.translate(-10.5, 1.5);
        drawJohnWickShotgun(ctx, 0, 0, 0, 0, { isThrown: true, inPreview: false });
      } else if (gun.weaponType === 'rifle') {
        ctx.translate(-9.3, -6.9);
        drawJohnWickRifle(ctx, 0, 0, 0, 0, { isThrown: true, inPreview: false });
      } else {
        ctx.translate(-16.0, -10.0);
        drawJohnWickPistol(ctx, 0, 0, 0, 0, { isThrown: true, inPreview: false });
      }

      ctx.restore();
    }
  }

  // 3. Draw Spent Casings (Physical tumbling 5.56, 12-gauge, and 9mm shells)
  if (state.spentCasings && state.spentCasings.length > 0) {
    for (let i = 0; i < state.spentCasings.length; i++) {
      const c = state.spentCasings[i];
      if (c.life <= 0) continue;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, c.life));
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);

      // Floor contact shadow when resting on or near bottom arena floor
      if (c.onGround || c.y > (CONFIG.arena.y + CONFIG.arena.height - 35)) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
        ctx.beginPath();
        const shadowW = c.casingType === '12gauge' ? 6.5 : (c.casingType === '556' ? 5.5 : 4.5);
        ctx.ellipse(0, 2.0, shadowW, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      if (c.casingType === '556') {
        // 5.56×45mm NATO Bottleneck Rifle Casing
        // Main brass cylinder body
        ctx.fillStyle = '#EAB308'; // Polished Brass
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.rect(-3.5, -1.3, 5.0, 2.6);
        ctx.fill();
        ctx.stroke();

        // Tapered neck / shoulder
        ctx.fillStyle = '#CA8A04';
        ctx.beginPath();
        ctx.moveTo(1.5, -1.3);
        ctx.lineTo(2.5, -0.9);
        ctx.lineTo(3.8, -0.9);
        ctx.lineTo(3.8, 0.9);
        ctx.lineTo(2.5, 0.9);
        ctx.lineTo(1.5, 1.3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Extractor groove rim at base
        ctx.fillStyle = '#78350F';
        ctx.fillRect(-3.8, -1.4, 0.7, 2.8);

        // Bright brass specular highlight glint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.fillRect(-2.5, -0.9, 3.5, 0.6);
      } else if (c.casingType === '12gauge') {
        // 12-Gauge Red Hull & Brass Base
        ctx.fillStyle = '#DC2626'; // High-brass red plastic hull
        ctx.strokeStyle = '#7F1D1D';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.roundRect(-2.0, -1.6, 6.0, 3.2, 0.4);
        ctx.fill();
        ctx.stroke();

        // Brass Head Base
        ctx.fillStyle = '#D97706';
        ctx.fillRect(-4.2, -1.7, 2.4, 3.4);
      } else {
        // 9mm Luger Pistol Brass
        ctx.fillStyle = '#F59E0B';
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.roundRect(-2.2, -1.2, 4.4, 2.4, 0.4);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }
}

/**
 * Resets and clears all active dropped magazines and thrown weapons
 */
export function clearDroppedMagazines() {
  if (typeof state !== 'undefined') {
    if (state.droppedMagazines) state.droppedMagazines.length = 0;
    if (state.thrownGuns) state.thrownGuns.length = 0;
    if (state.spentCasings) state.spentCasings.length = 0;
  }
}
