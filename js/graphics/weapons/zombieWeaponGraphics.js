// ─────────────────────────────────────────────
// ZOMBIE WEAPON & VISUAL EFFECTS GRAPHICS (Plants vs. Zombies)
// Adheres strictly to:
// - Rule 20: Symmetrical hand anchoring
// - Rule 26: Clean Concentric Shockwave Standard (Anti-Cobweb)
// - Rule 30: 5-Phase melee attack impact lock & kinematics
// - Rule 2.2: Zero shadowBlur CPU filters
// - Rule 2.4: 100% Balanced Canvas 2D Stacks
// ─────────────────────────────────────────────

import {
  _getZombieGravestoneImage,
  drawZombiePixelBody,
  drawZombieFist,
  _drawZombieHair,
  _drawZombieConeHat,
  _drawZombieBucketHat,
  _drawZombieFootballHelmetHat,
  _getZombieConeImage,
  _getZombieBucketImage,
  _getZombieFlagImage,
  _getZombieScreenDoorImage,
  _getZombieNewspaperImage,
  _getZombiePoleImage,
  _getZombieFootballHelmetImage,
  _getZombieTrophyImage,
} from '../fighters/zombieSkin.js';
import { getHandSize } from '../../core/config.js';

/**
 * Draws the vicious PvZ Chomp/Bite impact visual effect.
 * Renders cartoon teeth clamping down with green/yellow saliva sparks.
 */
export function drawZombieChompEffect(ctx, effect) {
  if (!ctx || !effect) return;

  const progress = Math.min(1.0, Math.max(0, (effect.maxLifetime - effect.lifetime) / effect.maxLifetime));
  const x = effect.x;
  const y = effect.y;
  const size = (effect.size || 40) * (0.8 + 0.4 * Math.sin(progress * Math.PI));

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(effect.angle || 0);

  // Upper and lower jaws clamping down
  const clampY = Math.max(0, (1.0 - progress * 2.2)) * 18;

  // Upper jaw teeth
  ctx.fillStyle = '#FEF08A'; // Sickly yellow teeth
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 2;

  // 3 Upper triangular teeth
  for (let i = -1; i <= 1; i++) {
    const tx = i * (size * 0.35);
    ctx.beginPath();
    ctx.moveTo(tx - 6, -clampY - 14);
    ctx.lineTo(tx + 6, -clampY - 14);
    ctx.lineTo(tx, -clampY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 3 Lower triangular teeth
  for (let i = -1; i <= 1; i++) {
    const tx = i * (size * 0.35);
    ctx.beginPath();
    ctx.moveTo(tx - 6, clampY + 14);
    ctx.lineTo(tx + 6, clampY + 14);
    ctx.lineTo(tx, clampY - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Green / yellow saliva splat droplets on impact
  if (progress > 0.25 && progress < 0.85) {
    const splatAlpha = Math.sin((progress - 0.25) / 0.60 * Math.PI);
    ctx.fillStyle = `rgba(132, 204, 22, ${0.85 * splatAlpha})`;
    for (let j = 0; j < 6; j++) {
      const ang = (j / 6) * Math.PI * 2;
      const dist = (progress - 0.25) * 45;
      const sx = Math.cos(ang) * dist;
      const sy = Math.sin(ang) * dist;
      ctx.beginPath();
      ctx.arc(sx, sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Rule 26: Concentric clean compression impact ring (Zero cobwebs)
  if (progress < 0.65) {
    const ringP = progress / 0.65;
    const ringR = size * 0.9 * Math.pow(ringP, 0.7);
    const ringAlpha = (1.0 - ringP) * 0.8;
    ctx.strokeStyle = `rgba(163, 230, 53, ${ringAlpha})`;
    ctx.lineWidth = 2.5 * (1.0 - ringP);
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Renders an active Gravestone on the arena floor and dirt clumps.
 */
export function drawZombieGravestone(ctx, gravestone) {
  if (!ctx || !gravestone) return;

  const img = _getZombieGravestoneImage();
  const riseProgress = Math.min(1.0, (gravestone.riseTimer || 0) / 30);
  const w = 48;
  const h = 48 * riseProgress;

  ctx.save();
  ctx.translate(gravestone.x, gravestone.y);

  // Dirt mound
  ctx.fillStyle = '#4E342E';
  ctx.beginPath();
  ctx.ellipse(0, 16, 32, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  if (img && img.complete && img.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, -w / 2, 16 - h, w, h);
  } else {
    // Fallback stone slab
    ctx.fillStyle = '#64748B';
    ctx.strokeStyle = '#0E0F14';
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, 16 - h, w, h);
    ctx.strokeRect(-w / 2, 16 - h, w, h);
  }

  // Dirt particle burst during rising
  if (riseProgress < 1.0) {
    ctx.fillStyle = '#78350F';
    for (let i = 0; i < 5; i++) {
      const dx = (Math.sin(i * 1.5 + riseProgress * 10) * 22);
      const dy = 16 - (1.0 - riseProgress) * 25 - (i * 4);
      ctx.fillRect(dx, dy, 3, 3);
    }
  }

  ctx.restore();
}

/**
 * Renders a summoned Zombie Minion shambling across the arena according to its variety.
 */
export function drawZombieMinion(ctx, minion) {
  if (!ctx || !minion) return;

  ctx.save();
  ctx.translate(minion.x, minion.y);

  // Vaulting elevation
  const vaultAlt = minion.vaultAltitude || 0;
  if (vaultAlt > 0) {
    // Shadow on floor
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 18 * (1 - vaultAlt * 0.3), 7 * (1 - vaultAlt * 0.3), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.translate(0, -vaultAlt);
  }

  ctx.rotate(minion.gunAngle || minion.angle || 0);

  const facingLeft = Math.abs(minion.gunAngle || 0) > Math.PI / 2;
  if (facingLeft) {
    ctx.scale(1, -1);
  }

  const r = minion.r || 18;
  const variety = minion.variety || 'regular';

  // 1. Draw Canonical Model Circle Body for Minion (Toji baseline standard - Rule 24)
  drawZombiePixelBody(ctx, r);

  // 2. Draw 3 Wiry Black Hairs on head
  if (variety !== 'football' && variety !== 'buckethead') {
    _drawZombieHair(ctx, r, facingLeft);
  }

  // 3. Draw Canonical Symmetrical Model Fists (Rule 20)
  const handR = getHandSize ? getHandSize(r * 0.30) : (r * 0.30);
  const leftHandX = -r * 0.82;
  const rightHandX = +r * 0.82;
  const handsY = +r * 0.38;
  drawZombieFist(ctx, rightHandX, handsY, handR, '#8B9B7E');
  drawZombieFist(ctx, leftHandX, handsY, handR, '#8B9B7E');

  // 4. Draw Variety Sprite Hats & Accessories
  if (variety === 'conehead') {
    _drawZombieConeHat(ctx, r);
  } else if (variety === 'buckethead') {
    _drawZombieBucketHat(ctx, r);
  } else if (variety === 'football') {
    _drawZombieFootballHelmetHat(ctx, r);
  } else if (variety === 'screendoor') {
    const doorImg = _getZombieScreenDoorImage();
    const doorW = r * 2.4;
    const doorH = r * 3.0;
    if (doorImg && doorImg.complete && doorImg.naturalWidth > 0) {
      ctx.drawImage(doorImg, r * 0.3, -doorH / 2, doorW, doorH);
    } else {
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(r * 0.3, -doorH / 2, 8, doorH);
    }
  } else if (variety === 'newspaper') {
    if ((minion.paperHp || 0) > 0) {
      const paperImg = _getZombieNewspaperImage();
      const paperW = r * 2.2;
      const paperH = r * 2.2;
      if (paperImg && paperImg.complete && paperImg.naturalWidth > 0) {
        ctx.drawImage(paperImg, r * 0.4, -paperH / 2, paperW, paperH);
      }
    } else {
      // Enraged eyes glowing red on circle face
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(r * 0.30, -r * 0.35, 3.5, 0, Math.PI * 2);
      ctx.arc(r * 0.60, -r * 0.35, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (variety === 'polevaulter') {
    const poleImg = _getZombiePoleImage();
    const poleLen = r * 3.6;
    if (poleImg && poleImg.complete && poleImg.naturalWidth > 0) {
      ctx.save();
      ctx.translate(r * 0.4, 0);
      ctx.rotate(minion.isVaulting ? Math.PI * 0.45 : -Math.PI * 0.15);
      ctx.drawImage(poleImg, -8, -poleLen / 2, 28, poleLen);
      ctx.restore();
    }
  } else if (variety === 'flag') {
    const flagImg = _getZombieFlagImage();
    const flagW = r * 2.8;
    const flagH = r * 2.8;
    if (flagImg && flagImg.complete && flagImg.naturalWidth > 0) {
      ctx.drawImage(flagImg, rightHandX - 8, handsY - flagH + 12, flagW, flagH);
    }
  }

  // 5. Minion Overhead Mini Health Bar
  const hpPct = Math.max(0, minion.hp / minion.maxHp);
  const barW = 28;
  const barH = 4;
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(-barW / 2, -r - 12, barW, barH);
  ctx.fillStyle = (variety === 'buckethead' || variety === 'football') ? '#38BDF8' : '#84CC16';
  ctx.fillRect(-barW / 2, -r - 12, barW * hpPct, barH);

  ctx.restore();
}

/**
 * Draws the iconic PvZ Wave Progress Bar with lawnmower track, wave flags, and advancing zombie head.
 */
export function drawZombieWaveProgressBar(ctx, zombieFighter, arena) {
  if (!ctx || !zombieFighter) return;

  const timer = zombieFighter.survivalTimer || 0;
  const maxTimer = zombieFighter.finalWaveTriggerFrames || 3600; // 60s
  const progress = Math.min(1.0, timer / maxTimer);

  const barW = Math.min(320, (arena ? arena.width : 450) - 80);
  const barH = 14;
  const barX = (arena ? arena.x + (arena.width - barW) / 2 : 110);
  const barY = (arena ? arena.y + 12 : 252);

  ctx.save();

  // Dark soil border frame
  ctx.fillStyle = '#1C1917';
  ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);

  // Grassy lawn background track
  ctx.fillStyle = '#166534';
  ctx.fillRect(barX, barY, barW, barH);

  // Active wave progress fill (advances from left to right)
  ctx.fillStyle = '#65A30D';
  ctx.fillRect(barX, barY, barW * progress, barH);

  // Wave 1, 2, and Final Wave Flag Markers
  // Wave 2 Flag at 20s (0.333)
  const f1X = barX + barW * (1200 / maxTimer);
  ctx.fillStyle = progress >= (1200 / maxTimer) ? '#EAB308' : '#DC2626';
  ctx.fillRect(f1X - 1, barY - 6, 3, barH + 8);
  ctx.beginPath();
  ctx.moveTo(f1X + 2, barY - 6);
  ctx.lineTo(f1X + 10, barY - 2);
  ctx.lineTo(f1X + 2, barY + 2);
  ctx.closePath();
  ctx.fill();

  // Wave 3 Flag at 40s (0.666)
  const f2X = barX + barW * (2400 / maxTimer);
  ctx.fillStyle = progress >= (2400 / maxTimer) ? '#EAB308' : '#DC2626';
  ctx.fillRect(f2X - 1, barY - 6, 3, barH + 8);
  ctx.beginPath();
  ctx.moveTo(f2X + 2, barY - 6);
  ctx.lineTo(f2X + 10, barY - 2);
  ctx.lineTo(f2X + 2, barY + 2);
  ctx.closePath();
  ctx.fill();

  // Final Wave Huge Flag at 60s (1.0)
  const fFinalX = barX + barW;
  ctx.fillStyle = progress >= 1.0 ? '#EF4444' : '#991B1B';
  ctx.fillRect(fFinalX - 2, barY - 8, 4, barH + 12);
  ctx.beginPath();
  ctx.moveTo(fFinalX - 14, barY - 8);
  ctx.lineTo(fFinalX - 2, barY - 8);
  ctx.lineTo(fFinalX - 2, barY + 4);
  ctx.lineTo(fFinalX - 14, barY + 4);
  ctx.closePath();
  ctx.fill();

  // Small Zombie Head Icon moving along progress track
  const headX = barX + barW * progress;
  const headY = barY + barH / 2;
  ctx.fillStyle = '#84CC16';
  ctx.beginPath();
  ctx.arc(headX, headY, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0E0F14';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Eyes on mini head
  ctx.fillStyle = '#FEF08A';
  ctx.fillRect(headX - 3, headY - 3, 2, 2);
  ctx.fillRect(headX + 1, headY - 3, 2, 2);

  // Time and Wave Label
  ctx.font = 'bold 11px "Impact", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const elapsedSec = Math.floor(timer / 60);
  const minStr = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const secStr = String(elapsedSec % 60).padStart(2, '0');

  let waveLabel = 'WAVE 1/3';
  if (timer >= 3600) {
    waveLabel = '⚠️ FINAL WAVE ⚠️';
    ctx.fillStyle = (Math.floor(timer / 15) % 2 === 0) ? '#EF4444' : '#FEF08A';
  } else if (timer >= 2400) {
    waveLabel = 'WAVE 3/3';
    ctx.fillStyle = '#FBBF24';
  } else if (timer >= 1200) {
    waveLabel = 'WAVE 2/3';
    ctx.fillStyle = '#38BDF8';
  } else {
    ctx.fillStyle = '#F8FAFC';
  }

  ctx.fillText(`${waveLabel}  |  ${minStr}:${secStr} / 01:00`, barX + barW / 2, barY + barH + 4);

  ctx.restore();
}

/**
 * Draws dynamic PvZ Wave Alert Banners ("A HUGE WAVE OF ZOMBIES IS APPROACHING!" / "FINAL WAVE!").
 */
export function drawZombieHugeWaveBanner(ctx, timer, maxTimer = 90, arena) {
  drawZombieWaveAlertBanner(ctx, { text: 'A HUGE WAVE OF ZOMBIES IS APPROACHING!', subtext: 'IS APPROACHING!', timer, maxTimer }, arena);
}

export function drawZombieWaveAlertBanner(ctx, banner, arena) {
  if (!ctx || !banner || banner.timer <= 0) return;

  const maxTimer = banner.maxTimer || 120;
  const progress = banner.timer / maxTimer;
  const pulse = Math.sin(progress * Math.PI * 8);
  const bannerAlpha = Math.min(1.0, Math.sin(progress * Math.PI) * 1.5);

  const arenaX = arena ? arena.x : 45;
  const arenaY = arena ? arena.y : 240;
  const arenaW = arena ? arena.width : 450;
  const arenaH = arena ? arena.height : 450;
  const centerY = arenaY + arenaH / 2;

  ctx.save();

  // Full-width warning strip
  const isFinal = banner.isFinal;
  ctx.fillStyle = isFinal
    ? `rgba(220, 38, 38, ${0.55 * bannerAlpha})`
    : `rgba(185, 28, 28, ${0.45 * bannerAlpha})`;
  ctx.fillRect(arenaX, centerY - 36, arenaW, 72);

  // Border lines with glow
  ctx.strokeStyle = isFinal ? '#F87171' : '#FCA5A5';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(arenaX, centerY - 36);
  ctx.lineTo(arenaX + arenaW, centerY - 36);
  ctx.moveTo(arenaX, centerY + 36);
  ctx.lineTo(arenaX + arenaW, centerY + 36);
  ctx.stroke();

  // Banner Header
  ctx.font = 'bold 22px "Impact", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textColor = pulse > 0 ? '#FEF08A' : '#FFFFFF';
  ctx.fillStyle = textColor;
  ctx.fillText(banner.text || 'A HUGE WAVE OF ZOMBIES IS APPROACHING!', arenaX + arenaW / 2, centerY - 10);

  // Subtitle
  ctx.font = 'bold 15px "Impact", "Arial Black", sans-serif';
  ctx.fillStyle = isFinal ? '#FCA5A5' : '#FEF08A';
  ctx.fillText(banner.subtext || 'SURVIVE THE ONSLAUGHT!', arenaX + arenaW / 2, centerY + 16);

  ctx.restore();
}

/**
 * Draws the Golden PvZ Sunflower Trophy and "YOU SURVIVED THE HORDE!" victory overlay.
 */
export function drawZombieVictoryBanner(ctx, timer, maxTimer = 180, arena) {
  if (!ctx || timer <= 0) return;

  const progress = Math.min(1.0, (maxTimer - timer) / maxTimer);
  const alpha = Math.min(1.0, Math.sin(progress * Math.PI) * 1.5);

  const arenaX = arena ? arena.x : 45;
  const arenaY = arena ? arena.y : 240;
  const arenaW = arena ? arena.width : 450;
  const arenaH = arena ? arena.height : 450;
  const cx = arenaX + arenaW / 2;
  const cy = arenaY + arenaH / 2;

  ctx.save();

  // Dark golden backdrop
  ctx.fillStyle = `rgba(15, 23, 42, ${0.75 * alpha})`;
  ctx.fillRect(arenaX, arenaY, arenaW, arenaH);

  // Trophy Image
  const trophy = _getZombieTrophyImage();
  const trophySize = 96;
  if (trophy && trophy.complete && trophy.naturalWidth > 0) {
    ctx.drawImage(trophy, cx - trophySize / 2, cy - trophySize - 10, trophySize, trophySize);
  }

  // Golden Victory Text
  ctx.font = 'bold 26px "Impact", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FBBF24';
  ctx.fillText('YOU SURVIVED THE HORDE!', cx, cy + 24);

  ctx.font = 'bold 16px "Impact", "Arial Black", sans-serif';
  ctx.fillStyle = '#FEF08A';
  ctx.fillText('THE LAWN IS SAFE!', cx, cy + 54);

  ctx.restore();
}

/**
 * Draws the classic bloody "THE ZOMBIES ATE YOUR BRAINS!" PvZ game over text.
 */
export function drawZombiesAteYourBrains(ctx, timer, maxTimer = 180, arena) {
  if (!ctx || timer <= 0) return;

  const progress = Math.min(1.0, (maxTimer - timer) / maxTimer);
  const alpha = Math.min(1.0, Math.sin(progress * Math.PI) * 1.6);

  const arenaX = arena ? arena.x : 45;
  const arenaY = arena ? arena.y : 240;
  const arenaW = arena ? arena.width : 450;
  const arenaH = arena ? arena.height : 450;
  const cx = arenaX + arenaW / 2;
  const cy = arenaY + arenaH / 2;

  ctx.save();

  // Dark bloody backdrop wash
  ctx.fillStyle = `rgba(69, 10, 10, ${0.80 * alpha})`;
  ctx.fillRect(arenaX, arenaY, arenaW, arenaH);

  // Dripping bloody text
  ctx.font = 'bold 28px "Impact", "Arial Black", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#EF4444';
  ctx.fillText('THE ZOMBIES', cx, cy - 24);
  ctx.fillText('ATE YOUR BRAINS!', cx, cy + 16);

  ctx.restore();
}
