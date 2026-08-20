import { goToTitle } from '../../core/gameFlow.js';
import { state } from '../../core/state.js';
import { updatePreviewBalls } from './FighterIndexScreen.js';
import { FIGHTER_DEFS, CONFIG } from '../../core/config.js';
import { Fighter } from '../../entities/fighter.js';
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { clearHealthHud } from '../hudManager.js?v=6';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar } from './uiFramework.js';
import { getFighterPreview } from './FighterPreviewCache.js';
import {
  drawRedSniperGun, drawOrangeFlamethrowerGun, drawBlueAimbotGun, drawGreenBottleGun,
  drawWhiteRailgun, drawWhiteChargeEffect, drawDarkSlateGrayShuriken, drawDarkSlateGrayMelee,
  drawGrayShield, drawGraySword, drawGrayBrokenSword, drawBerserkerDualAxes,
  drawCronosCrescentBlade, drawSpikeWeapon, drawSingleSpike, drawGunSlingerDualRevolver,
  drawEngineer, drawZeusWeapon, drawInvertedSpear, drawSplitSoulKatana,
  drawMahoragaSword, drawMahoraga3DWheel, drawMahoragaChestNecklace, drawMahoragaLeftPunch,
  drawMahitoClawWeapon
} from '../weaponVisuals.js';
import { drawMusashiWeapons, drawMusashiSheaths } from '../weapons/musashiWeaponGraphics.js';
import { drawRubyScythe } from '../weapons/rubyWeaponGraphics.js';
import { drawLaylaGun } from '../weapons/laylaWeaponGraphics.js';
import { drawShikaiZangetsu, drawTensaZangetsu } from '../weapons/ichigoWeaponGraphics.js';
import { drawNanamiCleaver } from '../weapons/nanamiWeaponGraphics.js';
import { drawJohnWickWeapon, drawJohnWickPistol, drawJohnWickShotgun, drawJohnWickRifle, drawJohnWickPencil } from '../weapons/johnWickWeaponGraphics.js';
import { audioSystem } from '../../systems/audioSystem.js';
import { getSkillSound } from '../../soundEffects/skillSounds.js';
import { getSkillEffectSound } from '../../soundEffects/skillEffectSounds.js';


function drawWeaponMenu() {
  const { ctx, canvas } = state;
  
  // Reset context to prevent leaks from previous frames
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  
  _clearButtons();
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Cinematic Background (Dark Vignette)
  const bgGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.8);
  bgGrad.addColorStop(0, '#111520');
  bgGrad.addColorStop(1, '#05070a');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updatePreviewBalls();

  // Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(120, 180, 255, 0.6)';
  ctx.shadowBlur = 10;
  ctx.fillText('WEAPON ARSENAL', canvas.width / 2, 45);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#888';
  ctx.font = '12px Arial';
  ctx.fillText('Inspect detailed weapon schematics', canvas.width / 2, 65);

  const cardX = Math.max(20, (canvas.width - 500) / 2);
  const cardW = Math.min(canvas.width - 40, 500);
  const cardH = 118;
  const cardSpacing = 14;
  const itemsPerPage = 5;

  const totalPages = Math.max(1, Math.ceil(FIGHTER_DEFS.length / itemsPerPage));
  if (state.weaponPage === undefined) state.weaponPage = 0;
  if (state.weaponPage >= totalPages) state.weaponPage = totalPages - 1;
  if (state.weaponPage < 0) state.weaponPage = 0;

  const startIdx = state.weaponPage * itemsPerPage;
  const pageItems = FIGHTER_DEFS.slice(startIdx, startIdx + itemsPerPage);

  const startY = 85;

  pageItems.forEach((def, pos) => {
    const idx = startIdx + pos;
    const cardY = startY + pos * (cardH + cardSpacing);

    // Glassmorphism Panel
    ctx.save();
    ctx.fillStyle = 'rgba(20, 25, 35, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 10);
    ctx.fill();
    ctx.stroke();

    // Glowing left accent line
    ctx.fillStyle = def.color;
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY + 10, 4, cardH - 20, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Text Layout
    ctx.fillStyle = def.color;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(def.name.toUpperCase(), cardX + 22, cardY + 14);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(def.type.toUpperCase(), cardX + 22, cardY + 36);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(def.ability, cardX + 22, cardY + 52);

    // Shortened description snippet
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '11px Arial';
    wrapText(ctx, def.desc, cardX + 22, cardY + 70, cardW - 145, 15);

    // Weapon Preview Pedestal
    const previewSize = 84;
    const previewX = cardX + cardW - previewSize / 2 - 16;
    const previewY = cardY + cardH / 2;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const pedGrad = ctx.createRadialGradient(previewX, previewY, 0, previewX, previewY, previewSize / 2);
    pedGrad.addColorStop(0, `rgba(255, 255, 255, 0.12)`);
    pedGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = pedGrad;
    ctx.beginPath();
    ctx.arc(previewX, previewY, previewSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(previewX, previewY);
    ctx.scale(0.65, 0.65);
    // Add a slight floating animation per card
    ctx.translate(0, Math.sin(Date.now() / 300 + idx) * 4);
    drawWeaponPreview(ctx, def.type, def.color);
    ctx.restore();

    // Make card clickable
    _registerButton(cardX, cardY, cardW, cardH, () => {
      state.selectedWeapon = def;
      state.showWeaponModel = false; // Start with weapon graphics only!
      state.showSummonModel = false;
      state.slashEditMode = false;
      state.gameState = 'weaponDetail';
    });
  });

  // ── Pagination Controls Bar ──
  const navY = startY + itemsPerPage * (cardH + cardSpacing) + 2;
  const navBtnW = 80;
  const navBtnH = 30;
  const navBtnCenterY = navY + navBtnH / 2;

  // Previous Page Button
  const prevBtnCenterX = cardX + navBtnW / 2;
  if (state.weaponPage > 0) {
    drawButton('◄ PREV', prevBtnCenterX, navBtnCenterY, () => {
      state.weaponPage--;
    }, navBtnW, navBtnH);
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX, navY, navBtnW, navBtnH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◄ PREV', prevBtnCenterX, navBtnCenterY);
  }

  // Page Indicator Badge
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PAGE ${state.weaponPage + 1} / ${totalPages}`, cardX + cardW / 2, navBtnCenterY);

  // Next Page Button
  const nextBtnLeftX = cardX + cardW - navBtnW;
  const nextBtnCenterX = nextBtnLeftX + navBtnW / 2;
  if (state.weaponPage < totalPages - 1) {
    drawButton('NEXT ►', nextBtnCenterX, navBtnCenterY, () => {
      state.weaponPage++;
    }, navBtnW, navBtnH);
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(nextBtnLeftX, navY, navBtnW, navBtnH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEXT ►', nextBtnCenterX, navBtnCenterY);
  }

  drawButton('⌂ BACK', cardX + 50, canvas.height - 40, () => { goToTitle(); }, 100, 35);
}

// ─────────────────────────────────────────────
// WEAPON DETAIL SCREEN
// ─────────────────────────────────────────────


function isFighterDemoAttacking(fighter) {
  if (!fighter) return false;
  return (
    (fighter.spearSwingTimer > 0) ||
    (fighter.katanaSlashTimer > 0) ||
    (fighter.punchAnimTimer > 0) ||
    (fighter.meleeSwingTimer > 0) ||
    (fighter.slashGlowTimer > 0) ||
    (fighter.isCleaving === true) ||
    (fighter.meleeCooldown > (fighter.meleeCooldownMax - 15))
  );
}

function drawWeaponInfoCard(ctx, def) {
  const { canvas } = state;
  const panelH = Math.min(150, canvas.height * 0.28);
  const panelY = canvas.height - panelH - 15;
  const panelW = Math.min(canvas.width - 30, 640);
  const panelX = (canvas.width - panelW) / 2;

  let nameText = def.name;
  let descText = def.desc;

  if (def.type === 'ichigo') {
    const skin = state.selectedIchigoSkin || 'shikai';
    if (skin === 'shikai') {
      nameText = 'Ichigo (Shikai)';
      descText = 'Wields massive Zangetsu with trailing white cloth ribbons. Unleashes Getsuga Tensho energy waves, 2-strike Shunpo flurry, and Hollow Mask under 30% HP. Ultimate unleashes Bankai: Tensa Zangetsu!';
    } else {
      nameText = 'Ichigo (Bankai)';
      descText = 'Wields sleek Tensa Zangetsu with fast frontal-arc sword slashes. Fires Kuroi Getsuga waves and dashes with Shunpo flurry. Ultimate unleashes Bankai: Tensa Zangetsu!';
    }
  }

  if (def.type === 'john_wick' || def.type === 'johnwick') {
    const activeIndex = (state.gameState === 'weaponDetail') ? (state.johnWickWeaponIndex || 0) : 0;
    if (activeIndex === 0) {
      nameText = 'John Wick (TTI Pit Viper 9mm)';
      descText = 'Wields the customized TTI Pit Viper 9mm Combat Master. Fires 12 high-velocity match rounds before entering the lethal 5-phase Gun-Fu Assassination Combo.';
    } else if (activeIndex === 1) {
      nameText = 'John Wick (Benelli M4 Shotgun)';
      descText = 'Wields the tactical Benelli M4 Super 90 shotgun with dynamic pump-racking. Fires 6 heavy buckshot spread blasts (6 pellets each) dealing massive close-range knockback.';
    } else if (activeIndex === 2) {
      nameText = 'John Wick (M4A1 Carbine)';
      descText = 'Wields the iconic M4A1 Carbine with classic carrying handle, ribbed handguard, triangular A-frame front sight, and 30-round STANAG curved magazine. Fires 30 rapid-fire supersonic 5.56 green-tip armor-piercing tracer rounds.';
    } else {
      nameText = 'John Wick (The No. 2 Pencil)';
      descText = 'Equips the legendary sharpened No. 2 cedar graphite pencil in a reverse grip during close-quarters assassination grab-and-stab combos, inflicting a stacking bleed debuff.';
    }
  }

  // Glassmorphism Card Panel
  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 24, 0.92)';
  ctx.strokeStyle = def.color || '#FFD700';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 12);
  ctx.fill();
  ctx.stroke();

  // Top Accent Line
  ctx.fillStyle = def.color || '#FFD700';
  ctx.shadowColor = def.color || '#FFD700';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(canvas.width / 2 - 40, panelY, 80, 3, 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Header: Name & Type
  ctx.fillStyle = def.color || '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(nameText.toUpperCase(), panelX + 20, panelY + 16);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = 'bold 11px Arial';
  ctx.fillText((def.category || 'FIGHTER').toUpperCase(), panelX + 20, panelY + 38);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 12px Arial';
  ctx.fillText(`⚡ ABILITY: ${def.ability || 'Special Weapon'}`, panelX + 20, panelY + 55);

  // Description snippet
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '11px Arial';
  wrapText(ctx, descText || '', panelX + 20, panelY + 76, panelW - 240, 16);

  // Stat Bars Column (Right Side of Info Card)
  const statW = 180;
  const statX = panelX + panelW - statW - 20;
  let statY = panelY + 32;

  drawPremiumStatBar(ctx, statX, statY, statW, 'HEALTH', `${def.hp || 100} HP`, Math.min(1.0, (def.hp || 100) / 300), '#4da3ff');
  statY += 28;
  drawPremiumStatBar(ctx, statX, statY, statW, 'DAMAGE', `${def.damage || 10} DMG`, Math.min(1.0, (def.damage || 10) / 40), '#ff4d4d');
  statY += 28;
  drawPremiumStatBar(ctx, statX, statY, statW, 'SPD', `${def.moveSpeed || 5} SPD`, Math.min(1.0, (def.moveSpeed || 5) / 10), '#55ff55');
  statY += 28;

  // ATK RANGE stat for applicable fighters
  if (def.type === 'mahito') {
    const baseReach = CONFIG.mahito?.punchRange || 75;
    const bodyR = def.radius || 25;
    const totalRange = bodyR + baseReach;
    drawPremiumStatBar(ctx, statX, statY, statW, 'ATK RANGE', `${bodyR} + ${baseReach}`, Math.min(1.0, totalRange / 200), '#D946EF');
  }

  ctx.restore();
}

function triggerWeaponDemoAttack(def) {
  if (!def) return;
  state.showWeaponModel = true;
  state.showSummonModel = false;

  if (!state.previewFighter || state.previewFighter.type !== def.type) {
    const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
    state.previewFighter = new FighterClass({
      ...def,
      startX: 0,
      startY: 0,
      startVx: 0,
      startVy: 0,
    });
    state.previewFighter.hideHpText = true;
  }

  const fighter = state.previewFighter;
  fighter.x = 0;
  fighter.y = 0;
  fighter.angle = 0;
  fighter.gunAngle = 0;

  if (typeof fighter.triggerDemoAttack === 'function') {
    fighter.triggerDemoAttack();
  }
}

function drawWeaponDetailScreen() {
  const { ctx, canvas } = state;
  const def = state.selectedWeapon;
  if (!def) {
    state.gameState = 'weapons';
    return;
  }

  const hasSummon = ['yuta', 'doppleganger', 'Engineer', 'black'].includes(def.type);

  if (state.showWeaponModel === undefined) {
    state.showWeaponModel = false;
  }

  // Reset context to prevent leaks from previous frames
  ctx.resetTransform();
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;

  _clearButtons();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Cinematic Background
  const bgGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.8);
  bgGrad.addColorStop(0, '#0f141e');
  bgGrad.addColorStop(1, '#020305');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Hero Display: massive radial backlight matching signature color
  const heroY = canvas.height * 0.30;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(canvas.width / 2, heroY, 0, canvas.width / 2, heroY, 250);
  // Parse hex to rgba for glow
  let r=0, g=150, b=255;
  if (def.color.startsWith('#') && def.color.length === 7) {
    r = parseInt(def.color.slice(1,3), 16);
    g = parseInt(def.color.slice(3,5), 16);
    b = parseInt(def.color.slice(5,7), 16);
  }
  glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`);
  glow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.05)`);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Animated Hero Weapon Display (With dynamic Zoom In / Out scale)
  const currentScale = state.weaponPreviewScale || 2.4;
  ctx.save();
  ctx.translate(canvas.width / 2, heroY);
  ctx.scale(currentScale, currentScale);
  // Bobbing animation - disabled during claw edit mode to keep handles static/aligned
  ctx.translate(0, state.clawEditMode ? 0 : Math.sin(Date.now() / 400) * 8);
  
  if (state.showSummonModel) {
    if (!state.previewSummonFighter || state.previewSummonFighter.type !== def.type) {
      const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
      state.previewSummonFighter = new FighterClass({
        ...def,
        startX: 0,
        startY: 0,
        startVx: 0,
        startVy: 0,
      });
    }
    const previewFighter = state.previewSummonFighter;
    previewFighter.hideHpText = true;
    previewFighter.x = 0;
    previewFighter.y = 0;
    previewFighter.angle = 0;

    try {
      if (def.type === 'yuta' && previewFighter.rika) {
        // Only draw Rika and center her perfectly
        previewFighter.rika.active = true;
        previewFighter.rika.x = 0;
        previewFighter.rika.y = 0;
        previewFighter.cursedEnergyAlpha = 1.0;
        
        // Drive both arm timers independently so they alternate, not swing together
        if ((state.previewRightArmTimer || 0) > 0) {
          state.previewRightArmTimer--;
          // Fire left arm 30 frames after right arm starts
          if (state.previewRightArmTimer === 30 && (state.previewLeftArmTimer || 0) <= 0) {
            state.previewLeftArmTimer = 60;
          }
        }
        if ((state.previewLeftArmTimer || 0) > 0) {
          state.previewLeftArmTimer--;
        }
        previewFighter.rika.attackTimer  = state.previewRightArmTimer || 0;
        previewFighter.rika.leftArmTimer = state.previewLeftArmTimer  || 0;

        // Draw cursed energy aura if toggled on
        if (state.previewShowCursedEnergy) {
          previewFighter._drawRikaCursedEnergyAura(ctx);
        }

        previewFighter._drawRika(ctx, { x: 100, y: 0 });
      } else {
        // Fallback for others that might not have custom standalone draw
        previewFighter.draw(ctx, { x: 100, y: 0 });
      }
    } catch (e) {
      console.error('Preview summon draw error:', e);
    }
  } else if (state.showWeaponModel) {
    if (!state.previewFighter || state.previewFighter.type !== def.type) {
      const FighterClass = FIGHTER_CLASS_MAP[def.type] || Fighter;
      state.previewFighter = new FighterClass({
        ...def,
        startX: 0,
        startY: 0,
        startVx: 0,
        startVy: 0,
      });
      state.previewFighter.hideHpText = true;
    }

    const previewFighter = state.previewFighter;
    previewFighter.x = 0;
    previewFighter.y = 0;

    // If Slash Editor is ON, freeze fighter in static mid-swing pose with 100% full slash arc
    if (state.slashEditMode) {
      previewFighter.spearSwingTimer = Math.floor((previewFighter.spearSwingMax || 55) * 0.55);
      previewFighter.katanaSlashTimer = 25;
      previewFighter.punchAnimTimer = 18;
      previewFighter.meleeSwingTimer = 10;
      previewFighter.meleeSwingActive = true;
      previewFighter.meleeCooldownMax = 50;
      previewFighter.meleeCooldown = 42;
      previewFighter.slashGlowTimer = 20;
    } else {
      if (previewFighter.spearSwingTimer > 0) previewFighter.spearSwingTimer--;
      if (previewFighter.katanaSlashTimer > 0) previewFighter.katanaSlashTimer--;
      if (previewFighter.punchAnimTimer > 0) previewFighter.punchAnimTimer--;
      if (previewFighter.slashSwingTimer > 0) previewFighter.slashSwingTimer--;
      if (previewFighter.recoilTimer > 0) previewFighter.recoilTimer--;
      if (previewFighter.slashGlowTimer > 0) previewFighter.slashGlowTimer--;
      if (previewFighter.meleeCooldown > 0) previewFighter.meleeCooldown--;
      if (previewFighter.wheelGlowTimer > 0) previewFighter.wheelGlowTimer--;

      if (previewFighter.wheelClickTimer > 0) {
        previewFighter.wheelClickTimer--;
        previewFighter.wheelRotation += (previewFighter.wheelTargetRotation - previewFighter.wheelRotation) * 0.25;
      } else if (previewFighter.wheelTargetRotation !== undefined) {
        previewFighter.wheelRotation = previewFighter.wheelTargetRotation;
      }

      if (previewFighter.isCleaving) {
        previewFighter.cleaveWindupTimer++;
        const maxWindup = CONFIG.mahoraga?.cleaveWindupFrames || 30;
        if (previewFighter.cleaveWindupTimer >= maxWindup) {
          previewFighter.isCleaving = false;
          previewFighter.cleaveWindupTimer = 0;
          audioSystem.playSFX('attack_swordswing', 1.0);
          audioSystem.playSFX('attack_explosion', 0.6);
        }
      }

      if (previewFighter.meleeSwingTimer > 0) {
        previewFighter.meleeSwingTimer--;
        if (previewFighter.meleeSwingTimer <= 0) {
          previewFighter.meleeSwingActive = false;
        }
      }

      if (previewFighter.trailGenTimer > 0) {
        previewFighter.trailGenTimer--;
        if (typeof previewFighter._getKatanaTipPositions === 'function') {
          const pos = previewFighter._getKatanaTipPositions();
          if (!previewFighter.swordTrail) previewFighter.swordTrail = [];
          previewFighter.swordTrail.unshift({ outer: pos.outer, inner: pos.inner, life: 1.0 });
          if (previewFighter.swordTrail.length > 20) previewFighter.swordTrail.pop();
        }
      }
      if (previewFighter.swordTrail && previewFighter.swordTrail.length > 0) {
        for (let i = previewFighter.swordTrail.length - 1; i >= 0; i--) {
          previewFighter.swordTrail[i].life -= 0.04;
          if (previewFighter.swordTrail[i].life <= 0) {
            previewFighter.swordTrail.splice(i, 1);
          }
        }
      }
    }

    // Auto Loop demo attack if slash studio auto-loop is ON
    if (state.slashEditMode && state.slashAutoLoop) {
      if (!isFighterDemoAttacking(previewFighter)) {
        triggerWeaponDemoAttack(def);
      }
    }

    try {
      const fakeTarget = { x: 80, y: 0, r: 25, hp: 100, maxHp: 100, vx: 0, vy: 0, applyKnockback: () => {}, applySlow: () => {}, applyTimeStop: () => {}, takeDamage: () => {} };
      previewFighter.draw(ctx, fakeTarget);
    } catch (e) {
      console.error('Preview draw error:', e);
    }
  } else {
    drawWeaponPreview(ctx, def.type, def.color);
  }
  ctx.restore();

  // Vertical Interactive Zoom Controls on right side of Hero display
  const zoomX = canvas.width - 26;
  const zoomY = heroY - 45;

  drawButton('🔍+', zoomX, zoomY, () => {
    state.weaponPreviewScale = Math.min(4.8, (state.weaponPreviewScale || 2.4) + 0.4);
  }, 32, 24);

  const zoomPct = Math.round(((state.weaponPreviewScale || 2.4) / 2.4) * 100);
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${zoomPct}%`, zoomX, zoomY + 22);

  drawButton('1:1', zoomX, zoomY + 38, () => {
    state.weaponPreviewScale = 2.4;
  }, 32, 20);

  drawButton('🔍-', zoomX, zoomY + 60, () => {
    state.weaponPreviewScale = Math.max(1.0, (state.weaponPreviewScale || 2.4) - 0.4);
  }, 32, 24);

  // Interactive Pagination for Multi-Weapon Fighters (Toji)
  if (def.type === 'toji') {
    state.tojiWeaponIndex = state.tojiWeaponIndex || 0;
    const currentWeaponLabel = (state.tojiWeaponIndex === 0) 
      ? '1/2: INVERTED SPEAR OF HEAVEN' 
      : '2/2: SPLIT SOUL KATANA';

    const pagY = canvas.height * 0.42;

    // Pagination Dots & Label
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(currentWeaponLabel, canvas.width / 2, pagY);

    // Left Arrow Button
    drawButton('◄', canvas.width / 2 - 140, pagY - 7, () => {
      state.tojiWeaponIndex = (state.tojiWeaponIndex === 0) ? 1 : 0;
      state.previewFighter = null;
    }, 35, 26);

    // Right Arrow Button
    drawButton('►', canvas.width / 2 + 140, pagY - 7, () => {
      state.tojiWeaponIndex = (state.tojiWeaponIndex === 0) ? 1 : 0;
      state.previewFighter = null;
    }, 35, 26);
  }

  // Interactive Pagination for Multi-Weapon Fighters (John Wick: Pit Viper / Shotgun / M4 Rifle / Pencil)
  if (def.type === 'john_wick' || def.type === 'johnwick') {
    state.johnWickWeaponIndex = state.johnWickWeaponIndex || 0;
    const labels = [
      '1/4: TTI PIT VIPER 9MM',
      '2/4: BENELLI M4 SHOTGUN',
      '3/4: M4A1 CARBINE RIFLE',
      '4/4: THE NO. 2 PENCIL'
    ];
    const currentWeaponLabel = labels[state.johnWickWeaponIndex] || labels[0];

    const pagY = canvas.height * 0.42;

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(currentWeaponLabel, canvas.width / 2, pagY);

    const updatePreviewState = () => {
      if (state.previewFighter) {
        if (state.johnWickWeaponIndex === 0) {
          state.previewFighter.currentEquippedWeapon = 'pistol';
          state.previewFighter.pencilAttackTimer = 0;
          state.previewFighter.isPencilEquipped = false;
        } else if (state.johnWickWeaponIndex === 1) {
          state.previewFighter.currentEquippedWeapon = 'shotgun';
          state.previewFighter.pencilAttackTimer = 0;
          state.previewFighter.isPencilEquipped = false;
        } else if (state.johnWickWeaponIndex === 2) {
          state.previewFighter.currentEquippedWeapon = 'rifle';
          state.previewFighter.pencilAttackTimer = 0;
          state.previewFighter.isPencilEquipped = false;
        } else {
          state.previewFighter.currentEquippedWeapon = 'pistol';
          state.previewFighter.isPencilEquipped = true;
          state.previewFighter.pencilAttackTimer = 999999;
        }
      }
    };

    // Left Arrow Button
    drawButton('◄', canvas.width / 2 - 130, pagY - 7, () => {
      state.johnWickWeaponIndex = (state.johnWickWeaponIndex + 3) % 4;
      updatePreviewState();
      audioSystem.playSFX('Assets/Sound Effects/Skills/johnwick-gunswitch.mp3', 0.9);
      audioSystem.playSFX('Assets/Sound Effects/Skills/johnwick-switchgun-voiceline.mp3', 1.0);
    }, 35, 26);

    // Right Arrow Button
    drawButton('►', canvas.width / 2 + 130, pagY - 7, () => {
      state.johnWickWeaponIndex = (state.johnWickWeaponIndex + 1) % 4;
      updatePreviewState();
      audioSystem.playSFX('Assets/Sound Effects/Skills/johnwick-gunswitch.mp3', 0.9);
      audioSystem.playSFX('Assets/Sound Effects/Skills/johnwick-switchgun-voiceline.mp3', 1.0);
    }, 35, 26);
  }

  // Interactive Skin Selector for Ichigo (Shikai / Bankai)
  if (def.type === 'ichigo') {
    const selectY = canvas.height * 0.42;
    const btnW = 90;
    const btnH = 26;
    const shikaiBtnX = canvas.width / 2 - 55;
    const bankaiBtnX = canvas.width / 2 + 55;

    // Draw Shikai button
    drawButton('SHIKAI', shikaiBtnX, selectY, () => {
      state.selectedIchigoSkin = 'shikai';
      if (state.previewFighter) {
        state.previewFighter.skin = 'shikai';
      }
    }, btnW, btnH);

    // Draw Bankai button
    drawButton('BANKAI', bankaiBtnX, selectY, () => {
      state.selectedIchigoSkin = 'bankai';
      if (state.previewFighter) {
        state.previewFighter.skin = 'bankai';
      }
    }, btnW, btnH);

    // Draw glowing golden outline on active skin
    const activeSkin = state.selectedIchigoSkin || 'shikai';
    const activeX = (activeSkin === 'shikai') ? shikaiBtnX : bankaiBtnX;
    ctx.save();
    ctx.strokeStyle = '#FFD700'; // Gold active outline
    ctx.lineWidth = 3.0;
    ctx.beginPath();
    ctx.roundRect(activeX - btnW / 2, selectY - btnH / 2, btnW, btnH, 10);
    ctx.stroke();
    ctx.restore();
  }

  // Fighter & Weapon Info Card HUD
  drawWeaponInfoCard(ctx, def);

  // Navigation Bar (Row 1 at Y = 25: Left = Arsenal, Right = Prev/Next)
  const navY = 22; 
  drawButton('← ARSENAL', 60, navY, () => {
    state.clawEditMode = false;
    state.gameState = 'weapons';
  }, 95, 28);

  const currentIdx = FIGHTER_DEFS.findIndex(f => f.type === def.type);
  if (currentIdx > 0) {
    drawButton('◄ PREV', canvas.width - 105, navY, () => {
      state.selectedWeapon = FIGHTER_DEFS[currentIdx - 1];
    }, 65, 28);
  }
  if (currentIdx < FIGHTER_DEFS.length - 1) {
    drawButton('NEXT ►', canvas.width - 36, navY, () => {
      state.selectedWeapon = FIGHTER_DEFS[currentIdx + 1];
    }, 65, 28);
  }

  // Action Bar (Row 2 at Y = 62: Dynamic Centered Buttons)
  const actionY = 58;
  const buttonsToDraw = [];

  // Toggle button between WEAPON ONLY graphics and FIGHTER MODEL
  const modelToggleText = state.showWeaponModel ? '🗡 WEAPON ONLY' : '👤 FIGHTER MODEL';
  buttonsToDraw.push({
    text: modelToggleText,
    width: 135,
    action: () => {
      state.showWeaponModel = !state.showWeaponModel;
      if (state.showWeaponModel) {
        state.showSummonModel = false;
      } else {
        state.slashEditMode = false;
      }
    }
  });

  // Toggle button to display ONLY the fighter's skin (without weapon)
  const skinOnlyToggleText = state.showSkinOnly ? '👕 SKIN ONLY: ON' : '👕 SKIN ONLY: OFF';
  buttonsToDraw.push({
    text: skinOnlyToggleText,
    width: 130,
    action: () => {
      state.showSkinOnly = !state.showSkinOnly;
      if (state.showSkinOnly) {
        state.showWeaponModel = true;
        state.showSummonModel = false;
      }
    }
  });

  const isAttacking = isFighterDemoAttacking(state.previewFighter);
  const demoBtnText = isAttacking ? '⚔ SWINGING...' : '⚔ DEMO ATTACK';
  buttonsToDraw.push({
    text: demoBtnText,
    width: 125,
    action: () => { 
      state.showWeaponModel = true;
      state.showSummonModel = false;
      triggerWeaponDemoAttack(def); 
    }
  });

  if (hasSummon) {
    const summonLabel = (def.type === 'yuta') ? 'RIKA' : (def.type === 'Engineer' ? 'TURRET' : 'SUMMON');
    const summonToggleText = state.showSummonModel ? `👻 ${summonLabel}: ON` : `👻 ${summonLabel}: OFF`;
    buttonsToDraw.push({
      text: summonToggleText,
      width: 110,
      action: () => {
        state.showSummonModel = !state.showSummonModel;
        if (state.showSummonModel) {
          state.showWeaponModel = false;
          state.showSkinOnly = false;
          state.slashEditMode = false;
        }
      }
    });
  }

  // Calculate total width & centered starting X with spacing gap
  const totalBtnWidth = buttonsToDraw.reduce((acc, b) => acc + b.width, 0);
  const gap = 12;
  const totalRowW = totalBtnWidth + (buttonsToDraw.length - 1) * gap;
  let currentBtnX = (canvas.width - totalRowW) / 2;

  buttonsToDraw.forEach(btn => {
    drawButton(btn.text, currentBtnX + btn.width / 2, actionY, btn.action, btn.width, 32);
    currentBtnX += btn.width + gap;
  });

  // Minion Actions (Left side of screen)
  if (hasSummon && state.showSummonModel) {
    drawButton('💥 ATTACK ANIM', 90, 110, () => {
      state.previewRightArmTimer = 60;
      state.previewLeftArmTimer  = 0;
    }, 120, 28);

    const ceLabel = state.previewShowCursedEnergy ? '🔮 CURSE ENERGY: ON' : '🔮 CURSE ENERGY: OFF';
    drawButton(ceLabel, 90, 145, () => {
      state.previewShowCursedEnergy = !state.previewShowCursedEnergy;
    }, 140, 28);
  }


}

function drawYutaKatana(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  const facingLeft = Math.abs(angle) > Math.PI / 2;
  const baseAngle = facingLeft ? Math.PI : 0;
  let diff = angle - baseAngle;
  let normDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
  if (facingLeft) {
    normDiff = -normDiff;
  }
  ctx.rotate(baseAngle);
  if (facingLeft) {
    ctx.scale(1, -1);
  }
  ctx.rotate(normDiff);

  const custom = (typeof state !== 'undefined' && state.weaponCustomizations && state.weaponCustomizations.yuta) ? state.weaponCustomizations.yuta : null;
  if (custom) {
    ctx.translate(custom.offsetX, custom.offsetY);
    ctx.scale(custom.scale, custom.scale);
    ctx.rotate(custom.angleOffset);
  }

  // 1. Kashira (Gold Pommel)
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(-18, -3, 3, 6);
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.strokeRect(-18, -3, 3, 6);

  // 2. Tsuka (Black Hilt underwrap)
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(-15, -2.5, 23, 5);
  ctx.strokeStyle = '#000000';
  ctx.strokeRect(-15, -2.5, 23, 5);

  // Menuki (Tiny gold ornaments inside the black tsuka gaps)
  ctx.fillStyle = '#DAA520';
  for (let dx = -13.25; dx <= 6; dx += 3.5) {
    ctx.fillRect(dx, -0.5, 1, 1);
  }

  // 3. Tsuka-ito (Red criss-cross wrap pattern)
  ctx.strokeStyle = '#D11A2A'; // Red wrap
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'butt';
  for (let dx = -15; dx <= 6; dx += 3.5) {
    ctx.beginPath();
    ctx.moveTo(dx, -2.5);
    ctx.lineTo(dx + 3.5, 2.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dx + 3.5, -2.5);
    ctx.lineTo(dx, 2.5);
    ctx.stroke();
  }

  // Fuchi (Dark Golden Hilt Collar)
  ctx.fillStyle = '#8B6508';
  ctx.fillRect(8, -2.5, 2, 5);
  ctx.strokeRect(8, -2.5, 2, 5);

  // Left Seppa (Spacer washer)
  ctx.fillStyle = '#DAA520';
  ctx.fillRect(10, -4, 0.8, 8);

  // 4. Tsuba (Golden Rounded Rectangular Guard)
  ctx.fillStyle = '#C5A059';
  ctx.beginPath();
  ctx.moveTo(10.8, -7);
  ctx.quadraticCurveTo(10.8, -8.5, 12.3, -8.5);
  ctx.lineTo(13.3, -8.5);
  ctx.quadraticCurveTo(14.8, -8.5, 14.8, -7);
  ctx.lineTo(14.8, 7);
  ctx.quadraticCurveTo(14.8, 8.5, 13.3, 8.5);
  ctx.lineTo(12.3, 8.5);
  ctx.quadraticCurveTo(10.8, 8.5, 10.8, 7);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = '#000000';
  ctx.stroke();

  // Tsuba Details (two hitsu-ana holes / engravings in the guard)
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(12.3, -4.5, 1, 1.2);
  ctx.fillRect(12.3, 3.3, 1, 1.2);

  // Right Seppa (Spacer washer)
  ctx.fillStyle = '#DAA520';
  ctx.fillRect(14.8, -4, 0.8, 8);

  // 5. Habaki (Golden Blade Collar)
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(15.6, -2, 3.4, 4);
  ctx.strokeRect(15.6, -2, 3.4, 4);

  // 6. Blade — Curved katana shape with authentic sori (gentle upward arc)
  ctx.beginPath();
  ctx.moveTo(19, -1.8);
  ctx.quadraticCurveTo(49, -4.2, 81, -8.0);
  ctx.quadraticCurveTo(78, -3.5, 75, -2.2);
  ctx.quadraticCurveTo(49, 1.2, 19, 2.2);
  ctx.closePath();
  ctx.fillStyle = '#E5E8E8'; // Polished silver steel
  ctx.fill();

  // Second, overlay the dark spine (Shinogi-ji) ending at the Yokote line (tip division)
  ctx.beginPath();
  ctx.moveTo(19, -1.8);
  ctx.quadraticCurveTo(49, -4.0, 75, -6.8);
  ctx.lineTo(75, -4.2);
  ctx.quadraticCurveTo(49, -0.8, 19, 0.2);
  ctx.closePath();
  ctx.fillStyle = '#2F3538'; // Dark spine steel
  ctx.fill();

  // Hamon line (temper line) — complex wavy boundary line
  ctx.beginPath();
  ctx.moveTo(19, 0.2);
  for (let x = 19; x <= 75; x += 3.5) {
    const waveY = 0.2 - 4.4 * ((x - 19) / 56) + Math.sin(x * 0.75) * 0.45;
    ctx.lineTo(x, waveY);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Metallic Mune Highlight — bright shine along the back spine of the blade
  ctx.beginPath();
  ctx.moveTo(19, -1.8);
  ctx.quadraticCurveTo(49, -4.2, 81, -8.0);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Third, draw a clean black stroke outline over the entire outer blade boundary
  ctx.beginPath();
  ctx.moveTo(19, -1.8);
  ctx.quadraticCurveTo(49, -4.2, 81, -8.0);
  ctx.quadraticCurveTo(78, -3.5, 75, -2.2);
  ctx.quadraticCurveTo(49, 1.2, 19, 2.2);
  ctx.closePath();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  ctx.restore();
}

function drawWeaponPreview(ctx, type, color) {
  // Draw the real weapon designs used by the fighter implementations.
  // The preview caller already translates to the preview center.
  const now = Date.now();
  // Important: weapon previews should NOT spin in the WEAPON menu.
  // Keep them at a stable angle based on the current render time,
  // but quantize to avoid visible rotation.
  const gunAngle = (state.gameState === 'weaponDetail' && state.weaponPreviewAngle !== undefined) ? state.weaponPreviewAngle : 0;

  // We map the type to the same underlying visual functions.
  // The in-game visuals expect absolute positions, but our preview draws around (0,0)
  // so we pass x=y=0.
  const r = 25; // approximate fighter radius for consistent weapon sizing

  // Offset the canvas to perfectly center the weapon (which is usually drawn at X = r)
  let offsetX = -40; // Default offset for most right-handed weapons
  if (type === 'black') offsetX = 0; // Symmetrical
  else if (type === 'knight' || type === 'musashi') offsetX = -20; 
  else if (type === 'zeus' || type === 'darkslategray' || type === 'berserker' || type === 'bomber' || type === 'melee') offsetX = -35;
  else if (type === 'cronos') offsetX = -55; // Huge blade
  else if (type === 'ruby') offsetX = -75; // Massive scythe
  else if (type === 'toji') offsetX = -40; // Inverted Spear
  else if (type === 'yuta') offsetX = -40; // Katana
  else if (type === 'layla') offsetX = -30; // Steampunk Energy Cannon
  else if (type === 'ichigo') {
    offsetX = (state.selectedIchigoSkin === 'shikai') ? -55 : -45;
  }
  
  ctx.translate(offsetX, 0);

  try {
    switch (type) {
      case 'ichigo': {
        const isShikaiActive = (state.selectedIchigoSkin === 'shikai');
        if (isShikaiActive) {
          drawShikaiZangetsu(ctx, 0, 0, gunAngle, r);
        } else {
          drawTensaZangetsu(ctx, 0, 0, gunAngle, r);
        }
        return;
      }

      case 'layla':
        drawLaylaGun(ctx, 0, 0, gunAngle, r, { isPreview: true });
        return;

      case 'crimsonsniper':
      case 'normal':
        // Sniper rifle (uses color tint internally via stroke/fill)
        drawRedSniperGun(ctx, 0, 0, gunAngle, r);
        return;

      case 'aimbot':
        // Aimbot laser gun
        drawBlueAimbotGun(ctx, 0, 0, gunAngle, r);
        return;

      case 'grenadier':
        // Alchemist grenade launcher
        drawGreenBottleGun(ctx, 0, 0, gunAngle, r);
        return;

      case 'laser':
        // Ivory railgun
        drawWhiteRailgun(ctx, 0, 0, gunAngle, r);
        return;

      case 'knight':
        // Gray knight shield + sword
        drawGrayShield(ctx, 0, 0, gunAngle, 0, 'none', r);
        drawGraySword(ctx, 0, 0, gunAngle, r);
        return;

      case 'darkslategray':
        // Assassin shuriken/melee dual visual — draw a shuriken stance
        drawDarkSlateGrayShuriken(ctx, 0, 0, gunAngle, r);
        return;

      case 'orange':
        // Flamethrower gun
        drawOrangeFlamethrowerGun(ctx, 0, 0, gunAngle, r);
        return;

      case 'berserker':
        // Dual axes
        drawBerserkerDualAxes(ctx, 0, 0, gunAngle, r, false, false, 0, 0, 24);
        return;

      case 'cronos':
        // Cronos crescent blade (melee weapon visual)
        drawCronosCrescentBlade(ctx, 0, 0, gunAngle, r, false, 0, 0, 10, 1);
        return;

      case 'yuta':
        // Yuta's Lore-Accurate Cursed Katana
        drawYutaKatana(ctx, 0, 0, gunAngle);
        return;

      case 'ruby':
        // Ruby's huge scythe
        drawRubyScythe(ctx, { r, gunAngle, activePullActive: false, passiveSpinActive: false, scytheSwingActive: false });
        return;

      case 'musashi': {
        const mockFighter = {
          x: 0,
          y: 0,
          r: r,
          gunAngle: gunAngle,
          oarWindupTimer: 0,
          strikeTimer: 0,
          nitenActiveTimer: 0,
          isNitenSecondHit: false,
          currentStance: 'water'
        };
        drawMusashiSheaths(ctx, mockFighter, false);
        drawMusashiWeapons(ctx, mockFighter);
        return;
      }

      case 'bomber': {
        const skinColor = color || '#4A2508';
        const skinAccentColor = '#FFD700';
        ctx.save();
        ctx.translate(r, 0);

        // Draw grenade launcher barrel
        ctx.fillStyle = skinColor;
        ctx.fillRect(0, -6, 20, 12);
        ctx.fillStyle = '#3B2A18';
        ctx.fillRect(15, -4, 8, 8);

        // Draw grenade texture pattern
        ctx.fillStyle = skinAccentColor;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(5 + i * 6, 0, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        return;
      }


      case 'gunslinger':
        // Dual revolvers
        drawGunSlingerDualRevolver(0, 0, gunAngle, gunAngle + 0.18, r, false, 0);
        return;

      case 'melee':
        // Spike fighter uses spike weapon visual
        drawSpikeWeapon(ctx, 0, 0, gunAngle, r, false, now);
        return;

      case 'black': {
        ctx.save();

        // Left orb
        ctx.save();
        ctx.translate(-r - 8, 0);
        const pulse = Math.sin(Date.now() / 200) * 0.2 + 1;
        ctx.beginPath();
        ctx.arc(0, 0, 8 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(153, 0, 255, 0.3)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();
        ctx.strokeStyle = '#9900ff';
        ctx.lineWidth = 1;
        ctx.stroke();

        const orbitAngle = Date.now() / 150;
        ctx.beginPath();
        ctx.arc(Math.cos(orbitAngle) * 6, Math.sin(orbitAngle) * 6, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#df80ff';
        ctx.fill();
        ctx.restore();

        // Right orb
        ctx.save();
        ctx.translate(r + 8, 0);
        const pulse2 = Math.sin(Date.now() / 200 + Math.PI) * 0.2 + 1;
        ctx.beginPath();
        ctx.arc(0, 0, 8 * pulse2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(153, 0, 255, 0.3)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#111';
        ctx.fill();
        ctx.strokeStyle = '#9900ff';
        ctx.lineWidth = 1;
        ctx.stroke();

        const orbitAngle2 = Date.now() / 150 + Math.PI;
        ctx.beginPath();
        ctx.arc(Math.cos(orbitAngle2) * 6, Math.sin(orbitAngle2) * 6, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#df80ff';
        ctx.fill();
        ctx.restore();

        ctx.restore();
        return;
      }

      case 'yuta': {
        // Draw Yuta Katana + Rika Cursed Energy Aura in weapon preview
        ctx.save();
        ctx.translate(r, 0);
        ctx.rotate(0.2);

        // Katana blade
        ctx.fillStyle = '#E8E8E8';
        ctx.strokeStyle = '#222222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(0, -2, 28, 4);
        ctx.fill();
        ctx.stroke();

        // Katana tsuba (guard) & hilt
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-2, -5, 4, 10);
        ctx.fillStyle = '#111111';
        ctx.fillRect(-12, -2.5, 10, 5);

        // Cursed energy glow surrounding blade
        ctx.shadowColor = '#FF1493';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#FF69B4';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0, -2, 28, 4);

        ctx.restore();
        return;
      }

      case 'Engineer':
        // Draws Engineer's shotgun active and wrench stowed on back
        drawEngineer(ctx, { x: 0, y: 0, gunAngle: gunAngle, r: r, lastWeaponUsed: 'shotgun' });
        return;

      case 'zeus':
        // Draws the Master Bolt
        drawZeusWeapon(ctx, 0, 0, gunAngle, r, Date.now() / 200);
        return;

      case 'toji': {
        // Detail screen uses manual pagination index; Grid cards auto-cycle every 2.5 seconds
        const isDetail = (state.gameState === 'weaponDetail');
        const activeIndex = isDetail 
          ? (state.tojiWeaponIndex || 0) 
          : (Math.floor(Date.now() / 2500) % 2);
        
        if (activeIndex === 0) {
          drawInvertedSpear(ctx, 0, 0, gunAngle, r);
        } else {
          drawSplitSoulKatana(ctx, 0, 0, gunAngle, r);
        }
        return;
      }

      case 'mahoraga':
        // Mahoraga's Sword of Extermination Wrist Blade
        drawMahoragaSword(ctx, 0, 0, gunAngle, r);
        return;

      case 'mahito':
        // Mahito's 5-Blade Scalpel Claws
        drawMahitoClawWeapon(ctx, 0, 0, gunAngle, r, false);
        return;

      case 'nanami':
        // Nanami's Wrapped Blunt Cleaver
        drawNanamiCleaver(ctx, 0, 0, gunAngle, r, false);
        return;

      case 'john_wick':
      case 'johnwick': {
        const isDetail = (state.gameState === 'weaponDetail');
        const activeIndex = isDetail 
          ? (state.johnWickWeaponIndex || 0) 
          : 0;
        
        if (activeIndex === 0) {
          drawJohnWickPistol(ctx, 0, 0, gunAngle, r);
        } else if (activeIndex === 1) {
          drawJohnWickShotgun(ctx, 0, 0, gunAngle, r);
        } else if (activeIndex === 2) {
          drawJohnWickRifle(ctx, 0, 0, gunAngle, r);
        } else {
          drawJohnWickPencil(ctx, 0, 0, gunAngle, r);
        }
        return;
      }

      default:
        // Fallback: draw the default gray gun used by base fighters
        ctx.save();
        ctx.translate(r, 0);
        ctx.fillStyle = '#444';
        ctx.fillRect(-3, -5, 14, 10);
        ctx.fillStyle = '#222';
        ctx.fillRect(8, -2.5, 10, 5);
        ctx.restore();
        return;
    }
  } catch (e) {
    console.warn('Weapon preview render failed:', type, e);

    // Last-resort fallback
    ctx.save();
    ctx.translate(r, 0);
    ctx.fillStyle = '#444';
    ctx.fillRect(-3, -5, 14, 10);
    ctx.fillStyle = '#222';
    ctx.fillRect(8, -2.5, 10, 5);
    ctx.restore();
  }
}

export { drawWeaponMenu, isFighterDemoAttacking, drawWeaponInfoCard, triggerWeaponDemoAttack, drawWeaponDetailScreen, drawYutaKatana, drawWeaponPreview };

const eventTarget = state.pixiApp ? state.pixiApp.view : state.canvas;
eventTarget.addEventListener('wheel', (e) => {
  if (state.gameState === 'weaponDetail') {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    state.weaponPreviewScale = Math.min(4.8, Math.max(1.0, (state.weaponPreviewScale || 2.4) + delta));
    return;
  }
  if (state.gameState === 'weapons') {
    e.preventDefault();
    const totalPages = Math.ceil(FIGHTER_DEFS.length / 5);
    if (e.deltaY > 0 && state.weaponPage < totalPages - 1) {
      state.weaponPage++;
    } else if (e.deltaY < 0 && state.weaponPage > 0) {
      state.weaponPage--;
    }
    return;
  }
}, { passive: false });

// Interactive Claw Editor Drag & Resize Logic
let isDraggingClaw = false;
let activeDragFinger = -1;
let activeDragType = null;

if (typeof window !== 'undefined') {
  eventTarget.addEventListener('mousedown', (e) => {
    if (state.gameState !== 'weaponDetail' || !state.clawEditMode || !state.selectedWeapon || state.selectedWeapon.type !== 'mahito') return;

    const rect = eventTarget.getBoundingClientRect();
    const scaleX = state.canvas.width / rect.width;
    const scaleY = state.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const currentScale = state.weaponPreviewScale || 2.4;
    const heroY = state.canvas.height * 0.30;
    const offsetX = -40;
    const handX = 25;

    // Convert mouse coordinates back to local space of preview display
    const localX = (mx - (state.canvas.width / 2 + offsetX * currentScale)) / currentScale;
    const localY = (my - heroY) / currentScale;

    const blades = state.mahitoClawCustomBlades;
    if (!blades) return;

    for (let i = 0; i < blades.length; i++) {
      const b = blades[i];
      const kx = handX + b.knuckleX;
      const ky = b.knuckleY;

      const cosAngle = Math.cos(b.fanAngle);
      const sinAngle = Math.sin(b.fanAngle);
      const tx = handX + b.knuckleX + b.length * cosAngle - b.tipY * sinAngle;
      const ty = b.knuckleY + b.length * sinAngle + b.tipY * cosAngle;

      // 1. Detect Knuckle Click (10px local radius hit box)
      if (Math.hypot(localX - kx, localY - ky) < 10) {
        isDraggingClaw = true;
        activeDragFinger = i;
        activeDragType = 'knuckle';
        return;
      }

      // 2. Detect Tip Click (10px local radius hit box)
      if (Math.hypot(localX - tx, localY - ty) < 10) {
        isDraggingClaw = true;
        activeDragFinger = i;
        activeDragType = 'tip';
        return;
      }
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingClaw || state.gameState !== 'weaponDetail' || !state.clawEditMode) return;

    const rect = eventTarget.getBoundingClientRect();
    const scaleX = state.canvas.width / rect.width;
    const scaleY = state.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const currentScale = state.weaponPreviewScale || 2.4;
    const heroY = state.canvas.height * 0.30;
    const offsetX = -40;
    const handX = 25;

    const localX = (mx - (state.canvas.width / 2 + offsetX * currentScale)) / currentScale;
    const localY = (my - heroY) / currentScale;

    const blades = state.mahitoClawCustomBlades;
    if (!blades || activeDragFinger < 0 || activeDragFinger >= blades.length) return;

    const b = blades[activeDragFinger];

    if (activeDragType === 'knuckle') {
      b.knuckleX = localX - handX;
      b.knuckleY = localY;
    } else if (activeDragType === 'tip') {
      const dx = localX - (handX + b.knuckleX);
      const dy = localY - b.knuckleY;
      const dist = Math.hypot(dx, dy);
      
      // Calculate length and rotation angle with correct trigonometric offset for b.tipY
      if (dist > Math.abs(b.tipY)) {
        b.length = Math.sqrt(dist * dist - b.tipY * b.tipY);
        b.fanAngle = Math.atan2(dy, dx) - Math.atan2(b.tipY, b.length);
      } else {
        b.length = 15;
        b.fanAngle = Math.atan2(dy, dx);
      }
    }
  });

  window.addEventListener('mouseup', () => {
    isDraggingClaw = false;
    activeDragFinger = -1;
    activeDragType = null;
  });
}
