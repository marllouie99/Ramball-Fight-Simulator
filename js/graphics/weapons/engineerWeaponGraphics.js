// ─────────────────────────────────────────────
// Engineer WEAPON & ENTITY GRAPHICS (100% Discrete Pixel Art Style — Saitama Tech)
// Features:
// - Shotgun: Walnut stock & pump, beveled gunmetal receiver, sliding pump action & ejecting shell
// - Wrench: Industrial cast-iron hook jaws, brass adjusting knurl, dipped red handle & crescent slash
// - Sentry Turret (Lv 1, 2, 3): Discrete pixel tripod, armored swivel head, Gatling barrels, rocket pod & laser
// - Dispenser: Upright heavy steel cabinet, glowing medical cross, CRT scanline provisions gauge & healing beam
// - Bullets & Muzzle Blasts: High-contrast discrete pixel tracers (Light & Dark Mode visible), starburst flashes & smoke
// Rule 11 (Zero shadowBlur) & Rule 20 Compliant
// ─────────────────────────────────────────────

import { state } from '../../core/state.js';
import { CONFIG, getHandSize } from '../../core/config.js';
import { drawEngineerPixelBody, drawEngineerPixelHand, _drawEngineerHair } from '../fighters/engineerSkin.js';

export const Engineer_WEAPON_GRAPHICS = {
  colors: {
    darkMetal: '#1E232B',
    mediumMetal: '#334155',
    lightMetal: '#64748B',
    wood: '#5C4033',          // Shotgun pump/stock
    wrench: '#94A3B8',        // Silver wrench
    accent: '#D97706',        // Goldenrod / brass accent
    outline: '#0B0D12',
    turretBase: '#1E232B',
    turretBody: '#334155',
    turretLens: '#06B6D4'
  }
};

const P = 2.0;
const snap = (v) => Math.round(v / P) * P;

/**
 * Main draw wrapper for Engineer in weapon studio, UI previews, and standalone rendering.
 */
export function drawEngineer(ctx, options = {}) {
  const {
    x = 0,
    y = 0,
    gunAngle = 0,
    r = 20,
    facingRight = true,
    wrenchActive = false,
    wrenchTimer = 0,
    wrenchAngle = 0,
    wrenchSlashFadeTimer = 0,
    shotgunRecoilTimer = 0,
    lastWeaponUsed = 'shotgun',
    color = '#ffcc00',
    hideHands = false,
    isWinnerReveal = false
  } = options;

  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly) || hideHands;

  ctx.save();
  ctx.translate(x, y);

  const angle = isWinnerReveal ? 0 : gunAngle;
  ctx.rotate(angle);
  const isFacingLeft = Math.abs(angle) > Math.PI / 2;
  if (isFacingLeft && !isWinnerReveal) {
    ctx.scale(1, -1);
  }

  // 1. Back Weapon (stowed on back)
  if (lastWeaponUsed === 'wrench') {
    drawEngineerShotgun(ctx, 0, 0, 0, r, true, 0, true, color, shouldHideHands, isWinnerReveal);
  } else {
    drawEngineerWrench(ctx, 0, 0, 0, r, true, 0, true, color, 0, shouldHideHands, isWinnerReveal);
  }

  // 2. 100% Discrete Pixel Art Body (Hard Hat, Goggles, Red Shirt, Denim Overalls, Toolbelt)
  drawEngineerPixelBody(ctx, r);

  // 3. Hard Hat PNG Overlay (Assets/model/Hair/Engineer-Hair.png)
  _drawEngineerHair(ctx, r, isFacingLeft);

  // 4. Front Weapon (active in hand)
  if (lastWeaponUsed === 'wrench') {
    drawEngineerWrench(ctx, 0, 0, wrenchActive ? wrenchAngle : 0, r, true, wrenchActive ? wrenchTimer : 0, false, color, wrenchSlashFadeTimer, shouldHideHands, isWinnerReveal);
  } else {
    drawEngineerShotgun(ctx, 0, 0, 0, r, true, shotgunRecoilTimer, false, color, shouldHideHands, isWinnerReveal);
  }

  ctx.restore();
}

/**
 * Renders the explosive muzzle blast flash and smoke wisps at the shotgun barrel tip in 100% discrete pixel art
 */
export function drawEngineerMuzzleBlast(ctx, x, y, blastP) {
  ctx.save();
  ctx.translate(snap(x), snap(y));

  const alpha = Math.max(0, 1.0 - blastP);
  const flashScale = 1.0 + blastP * 0.5;

  // 1. Expanding translucent pixel smoke puffs
  ctx.fillStyle = `rgba(148, 163, 184, ${(alpha * 0.45).toFixed(2)})`;
  const smokeBlocks = [
    { dx: 8 * flashScale, dy: -4, s: 6 },
    { dx: 14 * flashScale, dy: 2, s: 8 },
    { dx: 20 * flashScale, dy: -2, s: 6 }
  ];
  for (let s = 0; s < smokeBlocks.length; s++) {
    const sb = smokeBlocks[s];
    ctx.fillRect(snap(sb.dx), snap(sb.dy), sb.s, sb.s);
  }

  // 2. Outer Fiery Orange Radial Spikes
  ctx.fillStyle = `rgba(234, 88, 12, ${(alpha * 0.90).toFixed(2)})`;
  ctx.fillRect(0, -4, snap(20 * flashScale), 8);
  ctx.fillRect(snap(4 * flashScale), -10, snap(4 * flashScale), 20);
  ctx.fillRect(snap(8 * flashScale), -8, snap(6 * flashScale), 16);
  ctx.fillRect(snap(14 * flashScale), -4, snap(6 * flashScale), 8);

  // 3. Middle Bright Golden-Yellow Flare
  ctx.fillStyle = `rgba(251, 191, 36, ${alpha.toFixed(2)})`;
  ctx.fillRect(0, -3, snap(14 * flashScale), 6);
  ctx.fillRect(snap(2 * flashScale), -6, snap(4 * flashScale), 12);
  ctx.fillRect(snap(6 * flashScale), -4, snap(6 * flashScale), 8);

  // 4. Inner White-Hot Star Core
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
  ctx.fillRect(0, -2, snap(8 * flashScale), 4);
  ctx.fillRect(snap(2 * flashScale), -4, snap(3 * flashScale), 8);

  // 5. Ballistic Pixel Sparks
  const sparks = [
    { dx: 24 * flashScale, dy: -6, c: '#FFFFFF' },
    { dx: 28 * flashScale, dy: 4, c: '#FEF08A' },
    { dx: 34 * flashScale, dy: -1, c: '#F59E0B' },
    { dx: 22 * flashScale, dy: 8, c: '#EA580C' }
  ];
  for (let sp = 0; sp < sparks.length; sp++) {
    ctx.fillStyle = sparks[sp].c;
    ctx.fillRect(snap(sparks[sp].dx), snap(sparks[sp].dy), 2, 2);
  }

  ctx.restore();
}

/**
 * Draws Engineer's 12-Gauge Pump Shotgun in 100% discrete pixel art style.
 */
export function drawEngineerShotgun(ctx, x, y, gunAngle, r, facingRight, recoilTimer = 0, isStowed = false, color = '#ffcc00', shouldHideHands = false, isWinnerReveal = false) {
  ctx.save();
  ctx.translate(x, y);

  const maxRecoil = (CONFIG.Engineer && CONFIG.Engineer.shotgunRecoilDuration) || 28;
  const p = (recoilTimer > 0) ? Math.max(0, Math.min(1.0, 1.0 - (recoilTimer / maxRecoil))) : 1.0;

  let recoilX = 0;
  let muzzleRiseAngle = 0;
  let pumpOffset = 0;
  let ejectionPortOpen = 0;

  if (recoilTimer > 0 && !isStowed) {
    if (p < 0.15) {
      // Kickback & Muzzle Rise
      const kickP = p / 0.15;
      const easeKick = Math.sin(kickP * Math.PI * 0.5);
      recoilX = -easeKick * 10.0;
      muzzleRiseAngle = -easeKick * 0.12;
    } else if (p < 0.52) {
      // Pump Slide Back & Extraction
      const pumpP = (p - 0.15) / 0.37;
      const easePump = Math.sin(pumpP * Math.PI * 0.5);
      recoilX = -10.0 + pumpP * 4.0;
      muzzleRiseAngle = -0.12 * (1.0 - pumpP * 0.35);
      pumpOffset = -easePump * 8.0;
      ejectionPortOpen = easePump;
    } else if (p < 0.80) {
      // Pump Slam Forward
      const fwdP = (p - 0.52) / 0.28;
      const powerFwd = Math.pow(fwdP, 1.6);
      recoilX = -6.0 * (1.0 - powerFwd);
      muzzleRiseAngle = -0.08 * (1.0 - powerFwd);
      pumpOffset = -8.0 * (1.0 - powerFwd);
      ejectionPortOpen = 1.0 - powerFwd;
    } else {
      recoilX = 0;
      muzzleRiseAngle = 0;
      pumpOffset = 0;
      ejectionPortOpen = 0;
    }
  }

  const custom = (!isStowed && typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.engineer)
    ? state.weaponCustomizations.engineer
    : null;
  const customOffsetX = custom?.offsetX || 0;
  const customOffsetY = custom?.offsetY || 0;
  const customScale = custom?.scale ?? 1.0;
  const customAngle = custom?.angleOffset || 0;
  const customWidthScale = custom?.widthScale ?? 1.0;
  const customLengthScale = custom?.lengthScale ?? 1.0;

  if (isWinnerReveal) {
    if (isStowed) {
      ctx.translate(-r * 0.45, r * 0.35);
      ctx.rotate(Math.PI * 0.28);
      ctx.scale(0.95, 0.95);
    } else {
      ctx.translate(r * 0.95 + customOffsetX, r * 0.12 + customOffsetY);
      ctx.rotate(-0.16 + customAngle);
      ctx.scale(1.20 * customScale * customLengthScale, 1.20 * customScale * customWidthScale);
    }
  } else if (isStowed) {
    ctx.rotate(gunAngle + Math.PI);
    ctx.translate(r * 0.4, 0);
    ctx.rotate(Math.PI / 4);
    ctx.scale(0.95, 0.95);
  } else {
    ctx.rotate(gunAngle + (facingRight ? muzzleRiseAngle : -muzzleRiseAngle) + customAngle);
    ctx.translate(r + 6 + recoilX + customOffsetX, customOffsetY);
    ctx.scale(customScale * customLengthScale, customScale * customWidthScale);
  }

  if (!facingRight && !isWinnerReveal) {
    ctx.scale(1, -1);
  }

  const defaultShotgunScale = isStowed ? 1.0 : 1.20;
  ctx.scale(defaultShotgunScale, defaultShotgunScale);

  drawEngineerShotgunModel(ctx, recoilTimer, isStowed, color, shouldHideHands, pumpOffset, ejectionPortOpen);

  // Muzzle blast at barrel tip
  if (!isStowed && recoilTimer > (maxRecoil - 5) && !isWinnerReveal) {
    const blastP = (maxRecoil - recoilTimer) / 5;
    drawEngineerMuzzleBlast(ctx, 44, -3, blastP);
  }

  ctx.restore();
}

/**
 * Core 100% discrete pixel art model for Engineer's Shotgun.
 */
export function drawEngineerShotgunModel(ctx, recoilTimer, isStowed = false, color = '#ffcc00', shouldHideHands = false, pumpOffset = 0, ejectionPortOpen = 0) {
  ctx.save();

  // 1. Curved Pistol Grip & Stock (Rich Walnut Wood)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-26, 4, 18, 12);
  ctx.fillRect(-22, 14, 8, 4);

  // Walnut body
  ctx.fillStyle = '#78350F';
  ctx.fillRect(-24, 6, 14, 8);
  ctx.fillRect(-20, 12, 6, 4);

  // Wood highlights
  ctx.fillStyle = '#9A3412';
  ctx.fillRect(-22, 6, 10, 2);
  ctx.fillStyle = '#5C4033'; // Underside shadow
  ctx.fillRect(-20, 10, 8, 4);

  // Metal buttplate
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(-26, 6, 2, 10);

  // 2. Trigger Guard & Trigger
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-6, 3, 8, 5);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-4, 4, 4, 3);
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-4, 4, 2, 2);

  // 3. Main Steel Receiver (Parkerized Gunmetal)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-13, -7, 24, 12);

  ctx.fillStyle = '#334155';
  ctx.fillRect(-12, -6, 22, 10);

  // Top receiver highlight chamfer
  ctx.fillStyle = '#64748B';
  ctx.fillRect(-11, -6, 20, 2);
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(-8, -6, 12, 1);

  // Ejection Port
  const openW = snap(6.0 * (ejectionPortOpen || 0));
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(0, -4, 8, 4);

  if (ejectionPortOpen > 0.1) {
    ctx.fillStyle = '#CBD5E1'; // Silver bolt carrier
    ctx.fillRect(openW * 0.5, -3, 4, 2);
    ctx.fillStyle = '#F59E0B'; // Brass 12ga cartridge
    ctx.fillRect(0, -3, Math.max(2, openW * 0.8), 2);
  } else {
    ctx.fillStyle = '#CBD5E1'; // Closed bolt
    ctx.fillRect(1, -3, 6, 2);
  }

  // 4. Barrels (Twin Heavy Steel Tubes)
  // Main Barrel
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(10, -6, 34, 6);
  ctx.fillStyle = '#334155';
  ctx.fillRect(11, -5, 32, 4);
  ctx.fillStyle = '#64748B';
  ctx.fillRect(11, -5, 30, 1);

  // Front Bead Sight
  ctx.fillStyle = '#E2E8F0';
  ctx.fillRect(40, -7, 2, 2);

  // Under-barrel Magazine Tube
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(10, 0, 26, 5);
  ctx.fillStyle = '#1E232B';
  ctx.fillRect(11, 1, 24, 3);
  ctx.fillStyle = '#475569';
  ctx.fillRect(34, 1, 2, 3); // Magazine cap

  // 5. Walnut Wood Pump Handle (Forend) with dynamic slide offset
  const pX = snap(14 + pumpOffset);
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(pX - 1, -1, 14, 7);
  ctx.fillStyle = '#78350F';
  ctx.fillRect(pX, 0, 12, 5);
  ctx.fillStyle = '#9A3412';
  ctx.fillRect(pX, 0, 12, 1);
  // Tactile grip grooves
  ctx.fillStyle = '#5C4033';
  ctx.fillRect(pX + 3, 1, 1, 4);
  ctx.fillRect(pX + 6, 1, 1, 4);
  ctx.fillRect(pX + 9, 1, 1, 4);

  // 6. Ejecting Spent 12ga Red Shotgun Shell
  if (ejectionPortOpen > 0.35) {
    ctx.save();
    ctx.translate(snap(4 + ejectionPortOpen * 4), snap(-10 - ejectionPortOpen * 6));
    ctx.rotate(ejectionPortOpen * 1.5);
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(-3, -2, 6, 4);
    ctx.fillStyle = '#DC2626'; // Red hull
    ctx.fillRect(-2, -1, 3, 2);
    ctx.fillStyle = '#F59E0B'; // Brass rim
    ctx.fillRect(1, -1, 1, 2);
    ctx.restore();
  }

  // 7. Pixel Work Gloves holding the Shotgun
  if (!shouldHideHands && !isStowed) {
    // Front hand on trigger
    drawEngineerPixelHand(ctx, -2, 5, getHandSize(4.0), '#D97706', true);
    // Back hand on pump
    drawEngineerPixelHand(ctx, pX + 5, 2, getHandSize(3.6), '#D97706', true);
  }

  ctx.restore();
}

/**
 * Draws Engineer's Pipe Wrench in 100% discrete pixel art style.
 */
export function drawEngineerWrench(ctx, x, y, gunAngle, r, facingRight, timer, isStowed = false, color = '#ffcc00', slashFadeTimer = 0, shouldHideHands = false, isWinnerReveal = false) {
  ctx.save();
  ctx.translate(x, y);

  const swipeArc = Math.PI * 0.85;

  const custom = (!isStowed && typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.engineer)
    ? state.weaponCustomizations.engineer
    : null;
  const customOffsetX = custom?.offsetX || 0;
  const customOffsetY = custom?.offsetY || 0;
  const customScale = custom?.scale ?? 1.0;
  const customAngle = custom?.angleOffset || 0;
  const customWidthScale = custom?.widthScale ?? 1.0;
  const customLengthScale = custom?.lengthScale ?? 1.0;

  if (isWinnerReveal) {
    if (isStowed) {
      ctx.translate(-r * 0.50, r * 0.35);
      ctx.rotate(-Math.PI * 0.32);
      ctx.scale(0.85, 0.85);
    } else {
      ctx.translate(r * 0.95 + customOffsetX, r * 0.12 + customOffsetY);
      ctx.rotate(-0.20 + customAngle);
      ctx.scale(1.0 * customScale * customLengthScale, 1.0 * customScale * customWidthScale);
    }
  } else if (isStowed) {
    ctx.rotate(gunAngle + Math.PI);
    ctx.translate(r * 0.4, 0);
    ctx.rotate(-Math.PI / 4);
    ctx.scale(0.85, 0.85);
    if (!facingRight) ctx.scale(1, -1);
  } else {
    const flipDir = facingRight ? 1 : -1;
    let armAngleOffset = 0;
    let wristAngleOffset = 0;
    let showSlash = false;
    let slashProgress = 1.0;
    let slashAlpha = 0.0;

    if (timer > 0) {
      const maxTimer = CONFIG.Engineer?.wrenchSwipeDuration || 16;
      const p = Math.min(1.0, Math.max(0.0, 1.0 - (timer / maxTimer)));
      let swingT = 0;
      let wristOffset = 0;

      if (p < 0.20) {
        const wP = p / 0.20;
        const easeW = Math.sin(wP * Math.PI * 0.5);
        swingT = -easeW * 0.18;
        wristOffset = -0.60 * easeW;
      } else if (p < 0.65) {
        const sP = (p - 0.20) / 0.45;
        const powerCurve = Math.pow(sP, 1.75);
        swingT = -0.18 + 1.18 * powerCurve;
        wristOffset = -0.60 + 1.10 * Math.sin(sP * Math.PI);
      } else if (p < 0.82) {
        const hP = (p - 0.65) / 0.17;
        swingT = 1.0 + Math.sin(hP * Math.PI * 4) * 0.025;
        wristOffset = 0.50 * (1 - hP);
      } else {
        const rP = (p - 0.82) / 0.18;
        const easeR = Math.sin(rP * Math.PI * 0.5);
        swingT = 1.0 * (1 - easeR);
        wristOffset = 0;
      }

      armAngleOffset = (-swipeArc * 0.5 + swipeArc * swingT) * flipDir;
      wristAngleOffset = wristOffset * flipDir;
      showSlash = true;
      slashProgress = Math.min(1.0, Math.max(0.0, (swingT + 0.18) / 1.18));
      slashAlpha = (p < 0.20) ? (p / 0.20) : (p > 0.82 ? (1 - (p - 0.82) / 0.18) : 1.0);
    } else {
      armAngleOffset = 0;
      wristAngleOffset = 0;
      if (slashFadeTimer > 0) {
        showSlash = true;
        slashProgress = 1.0;
        slashAlpha = Math.pow(slashFadeTimer / 12, 1.4);
      }
    }

    // ── Pixel Art Industrial Crescent Slash Arc ──
    if (showSlash && slashAlpha > 0.01) {
      ctx.save();
      const startAngle = gunAngle + (-swipeArc * 0.5) * flipDir;
      const sweepAngle = (swipeArc * slashProgress) * flipDir;
      const midR = r + 28;
      const steps = 16;
      const stepAngle = sweepAngle / steps;

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = startAngle + i * stepAngle;
        const rad = midR + Math.sin(t * Math.PI) * 10;
        const px = snap(Math.cos(a) * rad);
        const py = snap(Math.sin(a) * rad);

        ctx.fillStyle = `rgba(245, 158, 11, ${(0.80 * slashAlpha).toFixed(2)})`;
        ctx.fillRect(px - 2, py - 2, 4, 4);

        ctx.fillStyle = `rgba(255, 255, 255, ${(0.95 * slashAlpha).toFixed(2)})`;
        ctx.fillRect(px - 1, py - 1, 2, 2);
      }
      ctx.restore();
    }

    ctx.rotate(gunAngle + armAngleOffset + customAngle);
    ctx.translate(r + 5 + customOffsetX, customOffsetY);
    ctx.scale(customScale * customLengthScale, customScale * customWidthScale);

    if (!shouldHideHands) {
      drawEngineerPixelHand(ctx, 0, 0, getHandSize(4.2), '#D97706', true);
    }

    ctx.rotate(wristAngleOffset);
    if (!facingRight) ctx.scale(1, -1);
  }

  ctx.scale(1.4, 1.4);

  // ── WRENCH PIXEL ART MODEL ──
  // 1. Tapered Red Handle
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-3, -3, 30, 6);

  ctx.fillStyle = '#DC2626'; // Dipped red grip
  ctx.fillRect(-2, -2, 28, 4);
  ctx.fillStyle = '#EF4444'; // Top highlight
  ctx.fillRect(-1, -2, 26, 1);
  ctx.fillStyle = '#991B1B'; // Bottom shadow
  ctx.fillRect(-1, 1, 26, 1);

  // Central Weight Hole
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(4, -1, 10, 2);

  // 2. Brass Knurled Nut Wheel
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(18, -6, 6, 8);
  ctx.fillStyle = '#D97706';
  ctx.fillRect(19, -5, 4, 6);
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(20, -5, 2, 1);

  // 3. Lower Fixed Jaw & Cast-Iron Housing
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(24, -12, 10, 14);
  ctx.fillStyle = '#475569';
  ctx.fillRect(25, -11, 8, 12);
  ctx.fillStyle = '#64748B';
  ctx.fillRect(25, -11, 2, 10);

  // Serrated Teeth on Lower Jaw
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(31, -10, 2, 2);
  ctx.fillRect(31, -6, 2, 2);

  // 4. Upper Movable Hook Jaw
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(20, -20, 18, 9);
  ctx.fillRect(32, -18, 6, 8);

  ctx.fillStyle = '#64748B';
  ctx.fillRect(21, -19, 16, 7);
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(22, -19, 14, 2);

  // Upper Jaw Hardened Teeth
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(31, -14, 2, 2);
  ctx.fillRect(34, -14, 2, 2);

  ctx.restore();
}

let _engBulletTrailGrad = null;
let _engBulletCoreGrad = null;
let _turretTrailGrad = null;
let _turretCoreGrad = null;

function _getEngBulletTrailGrad(ctx) {
  if (!_engBulletTrailGrad) {
    _engBulletTrailGrad = ctx.createLinearGradient(-32, 0, 0, 0);
    _engBulletTrailGrad.addColorStop(0, 'rgba(245, 158, 11, 0)');
    _engBulletTrailGrad.addColorStop(0.55, 'rgba(245, 158, 11, 0.40)');
    _engBulletTrailGrad.addColorStop(1.0, 'rgba(254, 240, 138, 0.90)');
  }
  return _engBulletTrailGrad;
}

function _getEngBulletCoreGrad(ctx) {
  if (!_engBulletCoreGrad) {
    _engBulletCoreGrad = ctx.createLinearGradient(-7, 0, 7, 0);
    _engBulletCoreGrad.addColorStop(0, '#B45309');    // Rich copper base
    _engBulletCoreGrad.addColorStop(0.55, '#F59E0B'); // Polished golden brass
    _engBulletCoreGrad.addColorStop(1.0, '#FEF08A');  // Bright yellow tip
  }
  return _engBulletCoreGrad;
}

function _getTurretTrailGrad(ctx) {
  if (!_turretTrailGrad) {
    _turretTrailGrad = ctx.createLinearGradient(-36, 0, 0, 0);
    _turretTrailGrad.addColorStop(0, 'rgba(234, 88, 12, 0)');
    _turretTrailGrad.addColorStop(0.50, 'rgba(245, 158, 11, 0.45)');
    _turretTrailGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.95)');
  }
  return _turretTrailGrad;
}

function _getTurretCoreGrad(ctx) {
  if (!_turretCoreGrad) {
    _turretCoreGrad = ctx.createLinearGradient(-8, 0, 8, 0);
    _turretCoreGrad.addColorStop(0, '#D97706');    // Copper jacket base
    _turretCoreGrad.addColorStop(0.60, '#F59E0B'); // Polished brass middle
    _turretCoreGrad.addColorStop(1.0, '#10B981');  // Green-tip steel penetrator
  }
  return _turretCoreGrad;
}

/**
 * Draws Engineer's Shotgun Buckshot Tracer Bullet (matching John Wick's gun projectile style).
 */
export function drawEngineerBullet(ctx, xOrObj, y, angle, scale = 1.0, lifeRatio = 1.0) {
  let bx, by, bAngle, bScale, bLife, bHistory;
  if (typeof xOrObj === 'object' && xOrObj !== null) {
    bx = xOrObj.x;
    by = xOrObj.y;
    const vx = (xOrObj.vx === 0 && xOrObj.vy === 0 && xOrObj._resumeVx !== undefined) ? xOrObj._resumeVx : (xOrObj.vx || 0);
    const vy = (xOrObj.vx === 0 && xOrObj.vy === 0 && xOrObj._resumeVy !== undefined) ? xOrObj._resumeVy : (xOrObj.vy || 0);
    bAngle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : (xOrObj.angle || 0);
    bScale = xOrObj.scale || 1.0;
    bLife = Math.max(0.4, (xOrObj.life || 40) / (xOrObj.maxLife || 40));
    bHistory = xOrObj.history;
  } else {
    bx = xOrObj;
    by = y;
    bAngle = angle || 0;
    bScale = scale || 1.0;
    bLife = lifeRatio !== undefined ? lifeRatio : 1.0;
  }
  if (bx === undefined || by === undefined || isNaN(bx) || isNaN(by)) return;

  const len = 14 * bScale;
  const width = 3.6 * bScale;

  // 1. Persistent World-Space Tracer Trail (using projectile path history - exactly like John Wick)
  if (bHistory && bHistory.length > 1) {
    ctx.save();
    // Outer golden-amber glow line
    ctx.beginPath();
    ctx.moveTo(bHistory[0].x, bHistory[0].y);
    for (let i = 1; i < bHistory.length; i++) {
      ctx.lineTo(bHistory[i].x, bHistory[i].y);
    }
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.45)';
    ctx.lineWidth = 2.0 * bScale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Inner hot-yellow highlight line on latest segments
    const sliceCount = Math.max(1, bHistory.length - 4);
    ctx.beginPath();
    ctx.moveTo(bHistory[sliceCount - 1].x, bHistory[sliceCount - 1].y);
    for (let i = sliceCount; i < bHistory.length; i++) {
      ctx.lineTo(bHistory[i].x, bHistory[i].y);
    }
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
    ctx.lineWidth = 1.0 * bScale;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(bAngle);

  // 2. High-speed Motion Trail (Fading gradient streak trailing backward)
  const trailLen = 32 * bScale;
  ctx.fillStyle = _getEngBulletTrailGrad(ctx);
  ctx.beginPath();
  ctx.moveTo(-trailLen, 0);
  ctx.lineTo(-len / 2, -width * 0.85);
  ctx.lineTo(0, 0);
  ctx.lineTo(-len / 2, width * 0.85);
  ctx.closePath();
  ctx.fill();

  // 3. Copper/Gold Bullet Core (Sharp aerodynamic metal jacket bullet)
  ctx.fillStyle = _getEngBulletCoreGrad(ctx);
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 0.8 * bScale;

  ctx.beginPath();
  // Flat back
  ctx.moveTo(-len / 2, -width / 2);
  // Straight body
  ctx.lineTo(len * 0.15, -width / 2);
  // Pointed aerodynamic tip
  ctx.quadraticCurveTo(len / 2, 0, len / 2, 0);
  ctx.quadraticCurveTo(len * 0.15, width / 2, len * 0.15, width / 2);
  // Straight body bottom
  ctx.lineTo(-len / 2, width / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Inner Hot-White core shine
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(-len * 0.2, -width * 0.25);
  ctx.lineTo(len * 0.2, 0);
  ctx.lineTo(-len * 0.2, width * 0.25);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Turret Bullet (matching John Wick's gun projectile style).
 */
export function drawTurretBullet(ctx, xOrObj, y, angle, scale = 1.0, lifeRatio = 1.0) {
  let bx, by, bAngle, bScale, bLife, bHistory;
  if (typeof xOrObj === 'object' && xOrObj !== null) {
    bx = xOrObj.x;
    by = xOrObj.y;
    const vx = (xOrObj.vx === 0 && xOrObj.vy === 0 && xOrObj._resumeVx !== undefined) ? xOrObj._resumeVx : (xOrObj.vx || 0);
    const vy = (xOrObj.vx === 0 && xOrObj.vy === 0 && xOrObj._resumeVy !== undefined) ? xOrObj._resumeVy : (xOrObj.vy || 0);
    bAngle = (vx !== 0 || vy !== 0) ? Math.atan2(vy, vx) : (xOrObj.angle || 0);
    bScale = xOrObj.scale || 1.0;
    bLife = Math.max(0.4, (xOrObj.life || 40) / (xOrObj.maxLife || 40));
    bHistory = xOrObj.history;
  } else {
    bx = xOrObj;
    by = y;
    bAngle = angle || 0;
    bScale = scale || 1.0;
    bLife = lifeRatio !== undefined ? lifeRatio : 1.0;
  }
  if (bx === undefined || by === undefined || isNaN(bx) || isNaN(by)) return;

  const len = 16 * bScale;
  const width = 3.8 * bScale;

  // 1. Persistent World-Space Tracer Trail (using projectile path history - exactly like John Wick)
  if (bHistory && bHistory.length > 1) {
    ctx.save();
    // Outer fiery-amber glow line
    ctx.beginPath();
    ctx.moveTo(bHistory[0].x, bHistory[0].y);
    for (let i = 1; i < bHistory.length; i++) {
      ctx.lineTo(bHistory[i].x, bHistory[i].y);
    }
    ctx.strokeStyle = 'rgba(249, 115, 22, 0.50)';
    ctx.lineWidth = 2.2 * bScale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Inner razor-sharp white-hot tracer line on latest segments
    const sliceCount = Math.max(1, bHistory.length - 4);
    ctx.beginPath();
    ctx.moveTo(bHistory[sliceCount - 1].x, bHistory[sliceCount - 1].y);
    for (let i = sliceCount; i < bHistory.length; i++) {
      ctx.lineTo(bHistory[i].x, bHistory[i].y);
    }
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 1.2 * bScale;
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(bAngle);

  // 2. High-speed Supersonic Motion Trail (Fading gradient streak trailing backward)
  const trailLen = 36 * bScale;
  ctx.fillStyle = _getTurretTrailGrad(ctx);
  ctx.beginPath();
  ctx.moveTo(-trailLen, 0);
  ctx.lineTo(-len / 2, -width * 0.85);
  ctx.lineTo(0, 0);
  ctx.lineTo(-len / 2, width * 0.85);
  ctx.closePath();
  ctx.fill();

  // 3. 7.62mm Armor-Piercing Bullet Core (Copper base, brass body, green penetrator tip)
  ctx.fillStyle = _getTurretCoreGrad(ctx);
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 0.8 * bScale;

  ctx.beginPath();
  // Flat back
  ctx.moveTo(-len / 2, -width / 2);
  // Straight body
  ctx.lineTo(len * 0.20, -width / 2);
  // Pointed aerodynamic tip
  ctx.quadraticCurveTo(len / 2, 0, len / 2, 0);
  ctx.quadraticCurveTo(len * 0.20, width / 2, len * 0.20, width / 2);
  // Straight body bottom
  ctx.lineTo(-len / 2, width / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 4. Inner Brilliant White-Hot core shine
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(-len * 0.25, -width * 0.25);
  ctx.lineTo(len * 0.25, 0);
  ctx.lineTo(-len * 0.25, width * 0.25);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Renders the industrial military tripod base for the Sentry Gun.
 */
function _drawTurretTripodBase(ctx, level, isHit) {
  const legLen = level === 3 ? 24 : (level === 2 ? 22 : 18);
  const legCount = 3;

  // Tripod Base Legs (anchored in world orientation)
  for (let i = 0; i < legCount; i++) {
    const a = (i * Math.PI * 2) / legCount - Math.PI / 2;
    ctx.save();
    ctx.rotate(a);

    // Main Strut Shell
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(-4, 0, 8, legLen + 2);

    // Dark Olive / Charcoal Metal Body
    ctx.fillStyle = isHit ? '#CBD5E1' : '#1E242B';
    ctx.fillRect(-3, 1, 6, legLen);
    ctx.fillStyle = isHit ? '#FFFFFF' : '#334155';
    ctx.fillRect(-3, 1, 2, legLen);

    // Hydraulic Cylinder / Piston Bracket (Lv 2 & 3)
    if (level >= 2) {
      ctx.fillStyle = '#0B0D12';
      ctx.fillRect(-6, 6, 12, 6);
      ctx.fillStyle = isHit ? '#E2E8F0' : '#475569';
      ctx.fillRect(-5, 7, 10, 4);
      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(-1, 4, 2, 8); // Polished silver hydraulic rod
    }

    // Swivel Footpad & Disc Base
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(-7, legLen - 1, 14, 5);
    ctx.fillStyle = isHit ? '#E2E8F0' : '#2A323D';
    ctx.fillRect(-6, legLen, 12, 3);
    ctx.fillStyle = '#64748B';
    ctx.fillRect(-4, legLen, 8, 1);

    ctx.restore();
  }

  // Heavy Center Swivel Collar Hub
  const hubR = level === 3 ? 9 : (level === 2 ? 8 : 7);
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-hubR - 1, -hubR - 1, hubR * 2 + 2, hubR * 2 + 2);
  ctx.fillStyle = isHit ? '#CBD5E1' : '#1E232B';
  ctx.fillRect(-hubR, -hubR, hubR * 2, hubR * 2);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-hubR + 2, -hubR + 2, hubR * 2 - 4, hubR * 2 - 4);
  ctx.fillStyle = '#D97706'; // Brass pivot teeth ring
  ctx.fillRect(-hubR + 3, -hubR + 3, hubR * 2 - 6, 2);
}

/**
 * Draws the rear RED Team ammunition drum.
 */
function _drawTurretAmmoDrum(ctx, level, isHit) {
  const drumW = level === 3 ? 18 : (level === 2 ? 16 : 14);
  const drumH = level === 3 ? 24 : (level === 2 ? 22 : 18);
  const drumX = -drumW - 2;
  const drumY = -drumH / 2;

  // Outline
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(drumX - 1, drumY - 1, drumW + 2, drumH + 2);

  // RED Team Burgundy / Crimson Body
  ctx.fillStyle = isHit ? '#CBD5E1' : '#7F1D1D';
  ctx.fillRect(drumX, drumY, drumW, drumH);
  ctx.fillStyle = isHit ? '#FFFFFF' : '#B91C1C';
  ctx.fillRect(drumX + 2, drumY + 2, drumW - 4, drumH - 4);

  // Specular Highlight
  ctx.fillStyle = isHit ? '#FFFFFF' : '#EF4444';
  ctx.fillRect(drumX + 3, drumY + 2, drumW - 6, 2);

  // Dark Steel Base Rim
  ctx.fillStyle = '#11141A';
  ctx.fillRect(drumX, drumY + drumH - 3, drumW, 3);
  ctx.fillStyle = '#475569';
  ctx.fillRect(drumX + 1, drumY + drumH - 2, drumW - 2, 1);

  // Ammo Conduit Connectors / Yellow Warning Decal
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(drumX + 3, drumY + drumH / 2 - 2, 3, 4);
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(drumX + 4, drumY + drumH / 2 - 1, 1, 2);
}

/**
 * Draws Level 1 Single Heavy Barrel.
 */
function _drawTurretLevel1Head(ctx, isHit) {
  _drawTurretAmmoDrum(ctx, 1, isHit);

  // Main Receiver Body
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-4, -8, 16, 16);
  ctx.fillStyle = isHit ? '#CBD5E1' : '#1E232B';
  ctx.fillRect(-3, -7, 14, 14);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-3, -7, 14, 3);

  // Cyan Optical Sensor Scope
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(0, -12, 8, 5);
  ctx.fillStyle = '#06B6D4';
  ctx.fillRect(1, -11, 6, 3);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(2, -11, 2, 1);

  // Single Heavy Barrel Assembly
  // Breech / Forward Receiver Sleeve
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(10, -5, 8, 10);
  ctx.fillStyle = isHit ? '#E2E8F0' : '#334155';
  ctx.fillRect(11, -4, 6, 8);

  // Gunmetal Barrel
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(16, -3.5, 16, 7);
  ctx.fillStyle = isHit ? '#CBD5E1' : '#1E293B';
  ctx.fillRect(16, -2.5, 14, 5);
  ctx.fillStyle = '#64748B';
  ctx.fillRect(16, -2.5, 14, 1.5);

  // Stepped Red Clamp Ring & Muzzle Crown
  ctx.fillStyle = '#B91C1C';
  ctx.fillRect(24, -4.5, 4, 9);
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(24, -4.5, 4, 1.5);
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(30, -3, 2, 6); // Dark muzzle bore
}

/**
 * Draws a curved segmented ammo feed chute.
 */
function _drawSegmentedAmmoChute(ctx, fromX, fromY, toX, toY, isHit) {
  const steps = 6;
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const curveY = Math.sin(t * Math.PI) * (toY > 0 ? 6 : -6);
    const px = snap(fromX + (toX - fromX) * t);
    const py = snap(fromY + (toY - fromY) * t + curveY);

    // Segment Link Outer Shell
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(px - 2, py - 3, 5, 6);

    // Charcoal Metal Link Body
    ctx.fillStyle = isHit ? '#E2E8F0' : '#2A323D';
    ctx.fillRect(px - 1, py - 2, 3, 4);

    // Brass Bullet Cartridge Rim Peeking Out
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(px, py - 1, 1, 2);
  }
}

/**
 * Draws a 6-barrel rotary Gatling minigun cluster.
 */
function _drawGatlingMinigunCluster(ctx, x, y, isHit) {
  ctx.save();
  ctx.translate(snap(x), snap(y));

  // Armored Receiver Box
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-4, -6, 12, 12);
  ctx.fillStyle = isHit ? '#CBD5E1' : '#1E232B';
  ctx.fillRect(-3, -5, 10, 10);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-3, -5, 10, 2);

  // Cylindrical Rotor Hub
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(6, -5, 6, 10);
  ctx.fillStyle = isHit ? '#E2E8F0' : '#475569';
  ctx.fillRect(7, -4, 4, 8);

  // 6-Barrel Rotary Minigun Cluster (Top, Center, Bottom)
  const barrelYs = [-4, -1, 2];
  for (let b = 0; b < barrelYs.length; b++) {
    const by = barrelYs[b];
    // Barrel Tube
    ctx.fillStyle = '#0B0D12';
    ctx.fillRect(10, by, 18, 3);
    ctx.fillStyle = isHit ? '#CBD5E1' : '#1E293B';
    ctx.fillRect(10, by + 0.5, 16, 2);
    ctx.fillStyle = '#64748B';
    ctx.fillRect(10, by + 0.5, 16, 0.8);
  }

  // Forward Retention Collar Ring
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(20, -5, 3, 10);
  ctx.fillStyle = isHit ? '#FFFFFF' : '#64748B';
  ctx.fillRect(20.5, -4, 2, 8);

  // Muzzle Crown Ring & Dark Bores
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(26, -5, 2, 10);
  ctx.fillStyle = '#11141A';
  ctx.fillRect(27, -4, 1, 8);

  ctx.restore();
}

/**
 * Draws Level 2 Twin Gatling Miniguns with dual looping ammo feed chutes.
 */
function _drawTurretLevel2Head(ctx, isHit) {
  _drawTurretAmmoDrum(ctx, 2, isHit);

  // Horizontal Crossbar Mounting Bracket
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-2, -16, 8, 32);
  ctx.fillStyle = isHit ? '#CBD5E1' : '#334155';
  ctx.fillRect(-1, -15, 6, 30);
  ctx.fillStyle = '#64748B';
  ctx.fillRect(-1, -15, 6, 2);
  ctx.fillRect(-1, 13, 6, 2);

  // Center Armored Swivel Core & Sensor Scope
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-4, -8, 14, 16);
  ctx.fillStyle = isHit ? '#CBD5E1' : '#1E232B';
  ctx.fillRect(-3, -7, 12, 14);
  ctx.fillStyle = '#06B6D4'; // Cyan Sensor Lens
  ctx.fillRect(1, -11, 6, 3);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(2, -11, 2, 1);

  // Dual Segmented Looping Ammo Belts
  _drawSegmentedAmmoChute(ctx, -14, -8, 2, -13, isHit);
  _drawSegmentedAmmoChute(ctx, -14, 8, 2, 13, isHit);

  // Top & Bottom Gatling Minigun Clusters
  _drawGatlingMinigunCluster(ctx, 6, -13, isHit);
  _drawGatlingMinigunCluster(ctx, 6, 13, isHit);
}

/**
 * Draws Level 3 Twin Gatlings + Top-Mounted RED Quad Rocket Launcher Pod.
 */
function _drawTurretLevel3Head(ctx, isHit) {
  // Base Twin Gatlings & Looping Ammo Chutes
  _drawTurretLevel2Head(ctx, isHit);

  // Articulated Vertical Rocket Support Arm
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-3, -22, 6, 12);
  ctx.fillStyle = isHit ? '#CBD5E1' : '#334155';
  ctx.fillRect(-2, -21, 4, 10);
  ctx.fillStyle = '#64748B';
  ctx.fillRect(-2, -21, 2, 10);

  // ── RED Quad Rocket Launcher Pod Box ──
  const podX = -6;
  const podY = -34;
  const podW = 26;
  const podH = 14;

  // Dark Outline Shell
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(podX - 1, podY - 1, podW + 2, podH + 2);

  // RED Team Crimson Box Body
  ctx.fillStyle = isHit ? '#CBD5E1' : '#7F1D1D';
  ctx.fillRect(podX, podY, podW, podH);
  ctx.fillStyle = isHit ? '#FFFFFF' : '#B91C1C';
  ctx.fillRect(podX + 1, podY + 1, podW - 2, podH - 2);

  // Top Highlight Ridge
  ctx.fillStyle = isHit ? '#FFFFFF' : '#EF4444';
  ctx.fillRect(podX + 1, podY + 1, podW - 2, 2);

  // Yellow Hazard Decal Patch
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(podX + 2, podY + 4, 6, 6);
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(podX + 3, podY + 5, 4, 4);
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(podX + 4, podY + 6, 2, 2);

  // 4 Circular Rocket Launch Tubes (2x2 Grid)
  const tubeXs = [11, 18];
  const tubeYs = [-32, -25];
  for (let tx of tubeXs) {
    for (let ty of tubeYs) {
      // Tube Bezel Rim
      ctx.fillStyle = '#0B0D12';
      ctx.fillRect(tx - 3, ty - 3, 6, 6);
      ctx.fillStyle = isHit ? '#FFFFFF' : '#334155';
      ctx.fillRect(tx - 2.5, ty - 2.5, 5, 5);

      // Dark Hollow Bore
      ctx.fillStyle = '#0B0D12';
      ctx.fillRect(tx - 1.5, ty - 1.5, 3, 3);

      // Armed Red/Gold Warhead Nose Cone Inside
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(tx - 0.5, ty - 0.5, 2, 2);
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(tx, ty, 1, 1);
    }
  }

  // Flexible Orange/Red Power Cables
  ctx.fillStyle = '#EA580C';
  ctx.fillRect(-2, -20, 1, 6);
  ctx.fillRect(-4, -18, 1, 6);
  ctx.fillRect(-3, -14, 2, 1);
}

/**
 * Draws the Sentry Turret (Lv 1, Lv 2, Lv 3) in 100% discrete pixel art (Saitama tech).
 */
export function drawTurret(ctx, turret) {
  const { x, y, r, gunAngle, isBuilding, buildProgress, owner, level = 1 } = turret;

  let zOffset = turret.z || 0;
  if (isBuilding) {
    const engineer = state.fighters && state.fighters[owner];
    if (engineer && engineer.z) {
      zOffset = engineer.z;
    }
  }

  ctx.save();
  ctx.translate(snap(x), snap(y - zOffset));

  const bp = (isBuilding && buildProgress !== undefined) ? buildProgress : 1;
  const s = r / 20;
  ctx.scale(s, s);

  const isHit = turret.hitFlashTimer > 0;

  // ═══════════════════════════════════════════
  // 1. CONSTRUCTION PHASE (Welding Sparks & Scaffolding)
  // ═══════════════════════════════════════════
  if (isBuilding && bp < 1) {
    const now = Date.now();
    ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
    ctx.fillRect(-22, -22, 44, 44);
    for (let i = 0; i < 6; i++) {
      const a = (now * 0.01 + i * 1.05) % (Math.PI * 2);
      const dist = 6 + (now * 0.05 + i * 5) % 20;
      ctx.fillStyle = (i % 2 === 0) ? '#FFFFFF' : '#F59E0B';
      ctx.fillRect(snap(Math.cos(a) * dist), snap(Math.sin(a) * dist), 2, 2);
    }
  }

  // ═══════════════════════════════════════════
  // 2. TRIPOD BASE (Anchored in World Orientation)
  // ═══════════════════════════════════════════
  _drawTurretTripodBase(ctx, level, isHit);

  // ═══════════════════════════════════════════
  // 3. ROTATING TURRET SWIVEL HEAD (Gun Angle)
  // ═══════════════════════════════════════════
  const angle = (gunAngle !== undefined) ? gunAngle : (turret.angle || 0);
  ctx.rotate(angle);

  const recoilTimer = turret.recoilTimer || 0;
  const recoilOff = (recoilTimer > 0) ? -snap((recoilTimer / 10) * 5) : 0;
  ctx.translate(recoilOff, 0);

  // Red Targeting Laser Beam
  ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
  ctx.fillRect(14, 0, 100, 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(114, -1, 3, 3); // Reticle point

  // Level-specific Swivel Head
  if (level === 1) {
    _drawTurretLevel1Head(ctx, isHit);
  } else if (level === 2) {
    _drawTurretLevel2Head(ctx, isHit);
  } else {
    _drawTurretLevel3Head(ctx, isHit);
  }

  // Muzzle Blast when firing
  if (recoilTimer > 0) {
    if (level === 1) {
      drawEngineerMuzzleBlast(ctx, 32, 0, 0.2);
    } else if (level === 2) {
      drawEngineerMuzzleBlast(ctx, 36, -13, 0.2);
      drawEngineerMuzzleBlast(ctx, 36, 13, 0.2);
    } else {
      drawEngineerMuzzleBlast(ctx, 36, -13, 0.2);
      drawEngineerMuzzleBlast(ctx, 36, 13, 0.2);
    }
  }

  ctx.restore();
}

/**
 * Draws the TF2 RED Dispenser Cabinet in 100% discrete pixel art (Saitama tech).
 */
export function drawDispenser(ctx, dispenser) {
  const { x, y, r, hp = 100, maxHp = 160, isBuilding, buildProgress } = dispenser;

  ctx.save();
  ctx.translate(snap(x), snap(y));

  const isHit = dispenser.hitFlashTimer > 0;
  const s = r / 20;
  ctx.scale(s, s);

  // ═══════════════════════════════════════════
  // 1. CONSTRUCTION PHASE (Blueprint Hologram & Sparks)
  // ═══════════════════════════════════════════
  const bp = (isBuilding && buildProgress !== undefined) ? buildProgress : 1;
  if (isBuilding && bp < 1) {
    const now = Date.now();
    ctx.fillStyle = 'rgba(14, 165, 233, 0.35)';
    ctx.fillRect(-20, -32, 40, 56);
    for (let i = 0; i < 6; i++) {
      const a = (now * 0.01 + i * 1.05) % (Math.PI * 2);
      const dist = 6 + (now * 0.05 + i * 5) % 20;
      ctx.fillStyle = (i % 2 === 0) ? '#FFFFFF' : '#F59E0B';
      ctx.fillRect(snap(Math.cos(a) * dist), snap(Math.sin(a) * dist), 2, 2);
    }
  }

  // ═══════════════════════════════════════════
  // 2. BASE MOUNTING FEET & FLOOR PLATE (Y: [18, 26])
  // ═══════════════════════════════════════════
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-20, 18, 40, 8);
  ctx.fillStyle = isHit ? '#CBD5E1' : '#1E232B';
  ctx.fillRect(-18, 19, 36, 6);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-16, 19, 32, 2);

  // Anti-slip Rubber Feet
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-18, 24, 8, 3);
  ctx.fillRect(10, 24, 8, 3);

  // ═══════════════════════════════════════════
  // 3. BOTTOM SCRAP & AMMO HOPPER BIN (Y: [6, 19])
  // ═══════════════════════════════════════════
  // Outer Shell
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-18, 5, 36, 15);

  // Burgundy RED Bin Body
  ctx.fillStyle = isHit ? '#CBD5E1' : '#7F1D1D';
  ctx.fillRect(-17, 6, 34, 13);
  ctx.fillStyle = isHit ? '#FFFFFF' : '#B91C1C';
  ctx.fillRect(-16, 7, 32, 11);

  // RED Team Stencil Logo
  ctx.fillStyle = '#FEF2F2';
  ctx.font = '900 6px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RED', 0, 13);

  // Hopper Open Bin with Visible Metal Scrap & Ammo
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-15, 6, 30, 4);

  // Silver Pipe Wrench Handle
  ctx.fillStyle = '#94A3B8';
  ctx.fillRect(-12, 7, 8, 2);
  ctx.fillStyle = '#DC2626'; // Dipped red wrench grip
  ctx.fillRect(-6, 7, 3, 2);

  // Brass Shotgun Shells / Cartridges
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(4, 7, 3, 2);
  ctx.fillRect(9, 7, 3, 2);
  ctx.fillStyle = '#D97706';
  ctx.fillRect(7, 7, 1, 2);
  ctx.fillRect(12, 7, 1, 2);

  // ═══════════════════════════════════════════
  // 4. MIDDLE DISPENSING SHELF & MEDICAL BAY (Y: [-8, 6])
  // ═══════════════════════════════════════════
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-18, -9, 36, 16);
  ctx.fillStyle = isHit ? '#CBD5E1' : '#7F1D1D';
  ctx.fillRect(-17, -8, 34, 14);

  // Recessed Stainless Steel Dispensing Cavity
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-15, -6, 30, 10);
  ctx.fillStyle = isHit ? '#E2E8F0' : '#1E242B';
  ctx.fillRect(-14, -5, 28, 8);

  // Pull-Out Steel Syringe Tray
  ctx.fillStyle = '#64748B';
  ctx.fillRect(-12, -1, 24, 4);
  ctx.fillStyle = '#CBD5E1';
  ctx.fillRect(-11, -1, 22, 1);

  // Medical Glass Vials & Syringes
  ctx.fillStyle = '#06B6D4'; // Cyan healing serum
  ctx.fillRect(-8, -3, 3, 3);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-4, -4, 2, 4); // Glass syringe
  ctx.fillStyle = '#22C55E'; // Green antidote vial
  ctx.fillRect(2, -3, 3, 3);

  // Glowing Emergency Red Push Button (Left Panel)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-13, -4, 4, 4);
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(-12, -3, 2, 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-12, -3, 1, 1);

  // ═══════════════════════════════════════════
  // 5. LEFT HEALING GAS CYLINDER & DIAL GAUGE (X: [-26, -17])
  // ═══════════════════════════════════════════
  // Tall Gas Cylinder Tank
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-26, -16, 9, 30);
  ctx.fillStyle = isHit ? '#CBD5E1' : '#C2410C';
  ctx.fillRect(-25, -15, 7, 28);
  ctx.fillStyle = isHit ? '#FFFFFF' : '#EA580C';
  ctx.fillRect(-24, -14, 5, 26);
  ctx.fillStyle = '#FB923C';
  ctx.fillRect(-24, -14, 2, 26); // Cylinder specular highlight

  // Metal Mounting Bands
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-26, -8, 9, 3);
  ctx.fillRect(-26, 4, 9, 3);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-25, -7, 7, 1);
  ctx.fillRect(-25, 5, 7, 1);

  // Red Medical Cross Badge on Cylinder
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(-24, 7, 5, 5);
  ctx.fillStyle = '#DC2626';
  ctx.fillRect(-23, 8, 3, 3);
  ctx.fillRect(-24, 9, 5, 1);

  // Brass Bottom Valve Knob
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-24, 14, 5, 4);
  ctx.fillStyle = '#D97706';
  ctx.fillRect(-23, 15, 3, 2);

  // Circular Dial Pressure Gauge (Top Left)
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-25, -25, 8, 8);
  ctx.fillStyle = isHit ? '#CBD5E1' : '#475569';
  ctx.fillRect(-24, -24, 6, 6);
  ctx.fillStyle = '#FFFFFF'; // White Dial Face
  ctx.fillRect(-23, -23, 4, 4);
  ctx.fillStyle = '#0B0D12'; // Needle pointing upward-right
  ctx.fillRect(-22, -22, 2, 1);
  ctx.fillRect(-21, -23, 1, 1);

  // ═══════════════════════════════════════════
  // 6. RIGHT FLEXIBLE SUPPLY CONDUIT (X: [17, 24])
  // ═══════════════════════════════════════════
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(17, -18, 6, 32);
  ctx.fillStyle = isHit ? '#CBD5E1' : '#1E242B';
  ctx.fillRect(18, -17, 4, 30);
  // Segmented Ribs
  for (let rY = -16; rY <= 10; rY += 4) {
    ctx.fillStyle = '#475569';
    ctx.fillRect(18, rY, 4, 1);
  }

  // ═══════════════════════════════════════════
  // 7. CRT PROVISIONS MONITOR & SPEEDOMETER GAUGE (Y: [-24, -9])
  // ═══════════════════════════════════════════
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-18, -25, 36, 17);
  ctx.fillStyle = isHit ? '#CBD5E1' : '#7F1D1D';
  ctx.fillRect(-17, -24, 34, 15);

  // Dark Monitor Screen Bezel
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-15, -23, 30, 13);

  // Luminous Semi-Circular Speedometer Screen
  ctx.fillStyle = '#450A0A'; // Deep CRT background
  ctx.fillRect(-14, -22, 28, 11);

  // Semi-Circular Glowing Crimson / Pink Dome Gauge
  ctx.fillStyle = '#991B1B';
  ctx.fillRect(-11, -19, 22, 7);
  ctx.fillRect(-8, -21, 16, 9);
  ctx.fillRect(-5, -22, 10, 10);
  ctx.fillStyle = '#EF4444';
  ctx.fillRect(-9, -19, 18, 6);
  ctx.fillRect(-6, -21, 12, 8);

  // Wedge Sector Dividing Radial Lines (TF2 Speedometer sectors)
  ctx.fillStyle = '#FCA5A5';
  ctx.fillRect(-5, -19, 1, 5);
  ctx.fillRect(0, -21, 1, 7);
  ctx.fillRect(5, -19, 1, 5);

  // Subtle CRT Scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';
  ctx.fillRect(-14, -20, 28, 1);
  ctx.fillRect(-14, -16, 28, 1);
  ctx.fillRect(-14, -12, 28, 1);

  // Dynamic Indicator Hand (E to F based on HP ratio)
  const hpRatio = Math.max(0, Math.min(1.0, hp / maxHp));
  const needleAngle = -Math.PI * 0.75 + hpRatio * Math.PI * 0.75;
  const nLen = 7;
  const nX = snap(Math.cos(needleAngle) * nLen);
  const nY = snap(-13 + Math.sin(needleAngle) * nLen);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, -13, 2, 2); // Center pivot
  ctx.fillRect(nX, nY, 2, 2); // Needle tip

  // ═══════════════════════════════════════════
  // 8. "PROVISIONS" ILLUMINATED BACKLIT SIGN (Y: [-31, -25])
  // ═══════════════════════════════════════════
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-18, -32, 36, 8);
  ctx.fillStyle = isHit ? '#FFFFFF' : '#E2E8F0'; // Illuminated off-white badge
  ctx.fillRect(-16, -31, 32, 6);

  // Red Script Stencil Text "PROVISIONS"
  ctx.fillStyle = '#DC2626';
  ctx.font = '900 5.5px "Rajdhani", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PROVISIONS', 0, -28);

  // ═══════════════════════════════════════════
  // 9. TOP CROWN CAP & CRT STATUS BOX (Y: [-38, -32])
  // ═══════════════════════════════════════════
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-16, -38, 32, 7);
  ctx.fillStyle = isHit ? '#CBD5E1' : '#7F1D1D';
  ctx.fillRect(-15, -37, 30, 5);
  ctx.fillStyle = '#B91C1C';
  ctx.fillRect(-14, -36, 28, 3);

  // Small Green Cross (+) Status Indicator Box
  ctx.fillStyle = '#0B0D12';
  ctx.fillRect(-11, -37, 7, 5);
  ctx.fillStyle = '#11141A';
  ctx.fillRect(-10, -36, 5, 3);
  ctx.fillStyle = '#22C55E';
  ctx.fillRect(-9, -35, 3, 1);
  ctx.fillRect(-8, -36, 1, 3);

  // Amber Fuse / Capacitor Indicator
  ctx.fillStyle = '#F59E0B';
  ctx.fillRect(6, -36, 2, 2);
  ctx.fillRect(9, -36, 2, 2);

  ctx.restore();
}

/**
 * Draws the Animated Healing Tether Beam from Dispenser to Target in 100% discrete pixel art.
 */
export function drawDispenserTetherBeam(ctx, fromX, fromY, toX, toY, isOvercharge = false) {
  ctx.save();
  const dx = toX - fromX;
  const dy = toY - fromY;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) {
    ctx.restore();
    return;
  }

  const steps = Math.ceil(dist / 6);
  const now = Date.now();

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const wave = Math.sin(now * 0.008 + i * 0.8) * 3;
    const px = snap(fromX + dx * t + (-dy / dist) * wave);
    const py = snap(fromY + dy * t + (dx / dist) * wave);

    ctx.fillStyle = isOvercharge ? '#06B6D4' : '#22C55E';
    ctx.fillRect(px - 2, py - 2, 4, 4);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(px - 1, py - 1, 2, 2);
  }

  ctx.restore();
}

/**
 * Draws the Holographic Healing Field Perimeter Ring for Dispenser in 100% discrete pixel art.
 */
export function drawDispenserHealingRing(ctx, dispenser) {
  if (!dispenser || dispenser.hp <= 0) return;

  const range = CONFIG.Engineer?.dispenserRange || 260;
  const now = Date.now();
  let currentRadius = range;
  let ringAlpha = 0.75;

  if (dispenser.isBuilding) {
    const buildP = dispenser.buildProgress || 0.05;
    currentRadius = range * buildP;
    ringAlpha = buildP * 0.55;
  }

  ctx.save();

  // Stepped Pixel Perimeter Ring with Medical Crosses
  const steps = 36;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2 + now * 0.0004;
    const px = snap(dispenser.x + Math.cos(a) * currentRadius);
    const py = snap(dispenser.y + Math.sin(a) * currentRadius);

    if (i % 6 === 0) {
      // Stepped Green Medical Cross
      ctx.fillStyle = `rgba(34, 197, 94, ${ringAlpha.toFixed(2)})`;
      ctx.fillRect(px - 1, py - 3, 2, 6);
      ctx.fillRect(px - 3, py - 1, 6, 2);
    } else {
      // Perimeter Pixel Dot
      ctx.fillStyle = `rgba(74, 222, 128, ${(ringAlpha * 0.6).toFixed(2)})`;
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
  }

  ctx.restore();
}
