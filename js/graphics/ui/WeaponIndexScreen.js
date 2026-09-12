import { goToTitle } from '../../core/gameFlow.js';
import { state } from '../../core/state.js';
import { updatePreviewBalls } from './FighterIndexScreen.js';
import { FIGHTER_DEFS, CONFIG } from '../../core/config.js';
import { Fighter } from '../../entities/fighter.js';
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { clearHealthHud } from '../hudManager.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar, drawChamferedRect, fitSingleLineText } from './uiFramework.js';
import { getFighterPreview } from './FighterPreviewCache.js';
import { getFighterWeaponInfo } from './CharacterSelectScreen.js';
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
import { drawRubbickStaff } from '../weapons/rubbickWeaponGraphics.js';
import { drawLaylaGun } from '../weapons/laylaWeaponGraphics.js';
import { drawShikaiZangetsu, drawTensaZangetsu } from '../weapons/ichigoWeaponGraphics.js';
import { drawNanamiCleaver } from '../weapons/nanamiWeaponGraphics.js';
import { drawMegumiShadowBlade } from '../weapons/megumiWeaponGraphics.js';
import { drawUlquiorraMurcielago } from '../weapons/ulquiorraWeaponGraphics.js';
import { drawYutaFist } from '../fighters/yutaSkin.js';
import { drawUryuBow } from '../weapons/uryuWeaponGraphics.js';
import { drawJohnWickWeapon, drawJohnWickPistol, drawJohnWickShotgun, drawJohnWickRifle, drawJohnWickPencil } from '../weapons/johnWickWeaponGraphics.js';
import { drawCjBrassKnuckles, drawCjJetpackWeapon, drawCjMicroUzi, drawCjMinigun, drawCjTec9 } from '../weapons/cjWeaponGraphics.js';
import { drawTacticalRifleWeapon, drawTacticalShotgunWeapon, drawTacticalPistolWeapon, drawTacticalSniperWeapon, drawBarrettWeapon, TACTICAL_FIGHTER_DEFS } from '../../../Tactical Force/index.js';
import { drawDenjiWeaponPreview } from '../weapons/denjiWeaponGraphics.js';
import { drawPowerWeaponPreview } from '../weapons/powerWeaponGraphics.js';
import { drawTanjiroNichirinKatana, drawNezukoDemonClaws, drawZenitsuLightningKatana, drawInosukeDualSerratedKatanas } from '../weapons/demonSlayerWeaponGraphics.js';
import { spawnHollowMaskShatter, updateDeathEffects, drawDeathEffects } from '../particles/deathShatterEffect.js';
import { audioSystem } from '../../systems/audioSystem.js';

// ─────────────────────────────────────────────
// REVIEW STUDIO SIMULATION STATE
// ─────────────────────────────────────────────

const _reviewDummy = {
  x: 0,
  y: 0,
  homeX: 0,
  homeY: 0,
  vx: 0,
  vy: 0,
  r: 22,
  hp: 1000,
  maxHp: 1000,
  hitFlash: 0,
  stasisTimer: 0,
  takeDamage(amt) {
    this.hp = Math.max(0, this.hp - amt);
    this.hitFlash = 12;
  },
  applyKnockback(kx, ky) {
    this.vx += kx;
    this.vy += ky;
  },
  applyHitStun(t) {
    this.hitFlash = Math.max(this.hitFlash, t);
  },
  applyTimeStop(t) {
    this.stasisTimer = Math.max(this.stasisTimer, t);
  },
  reset() {
    this.x = this.homeX;
    this.y = this.homeY;
    this.vx = 0;
    this.vy = 0;
    this.hp = 1000;
    this.hitFlash = 0;
    this.stasisTimer = 0;
  }
};

let _reviewParticles = [];
let _reviewDamageTexts = [];
let _reviewProjectiles = [];
let _reviewActiveSkill = null;
let _reviewSkillTimer = 0;
let _reviewSkillMaxTimer = 0;
let _reviewFrameStepRequested = false;

function spawnReviewDamageText(x, y, text, color = '#ffffff') {
  _reviewDamageTexts.push({
    x: x + (Math.random() - 0.5) * 20,
    y: y - 10 + (Math.random() - 0.5) * 10,
    text,
    color,
    life: 45,
    maxLife: 45,
    vy: -1.2 - Math.random() * 0.8
  });
}

function spawnReviewImpactSparks(x, y, color = '#ffcc00', count = 8) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    _reviewParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 1.5 + Math.random() * 2.5,
      color,
      life: 20 + Math.random() * 15,
      maxLife: 35
    });
  }
}

// ─────────────────────────────────────────────
// 1. FIGHTER & WEAPON REVIEW ROSTER GRID
// ─────────────────────────────────────────────

function drawWeaponMenu() {
  const { ctx, canvas } = state;
  
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;
  
  _clearButtons();
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sleek Dark Gunmetal Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, '#07080c');
  bgGrad.addColorStop(0.5, '#10131c');
  bgGrad.addColorStop(1, '#07080c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updatePreviewBalls();

  // Unified Top Back Button
  drawButton('◀ BACK', 52, 60, () => { goToTitle(); }, 76, 26);

  // Header Section
  ctx.fillStyle = '#64748b';
  ctx.font = '900 10px "Rajdhani", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('CIRCLE BATTLE // COMBATANT & ARSENAL REVIEW // SYS.v3.0', canvas.width / 2, 48);

  ctx.save();
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 22px "Outfit", "Rajdhani", sans-serif';
  ctx.fillText('[ FIGHTER & WEAPON REVIEW ]', canvas.width / 2, 70);
  ctx.restore();

  // Category Switcher Tabs
  if (!state.weaponCategoryTab) {
    state.weaponCategoryTab = (state.gameCategory === 'tactical') ? 'tactical' : 'foc';
  }

  const tabY = 94;
  const tabW = 160;
  const tabH = 24;
  const tabGap = 10;
  const totalTabsW = tabW * 2 + tabGap;
  const tabStartX = (canvas.width - totalTabsW) / 2;

  // Tab 1: FOC Fantasy / Anime Weapons
  const isFoc = state.weaponCategoryTab !== 'tactical';
  drawButton(
    isFoc ? '⚔️ [ FOC FIGHTERS & ARSENAL ]' : '⚔️ FOC FIGHTERS & ARSENAL',
    tabStartX + tabW / 2,
    tabY,
    () => {
      if (state.weaponCategoryTab !== 'foc') {
        state.weaponCategoryTab = 'foc';
        state.weaponPage = 0;
      }
    },
    tabW,
    tabH,
    isFoc ? '#f59e0b' : null,
    4
  );

  // Tab 2: Tactical Force Firearms
  const isTac = state.weaponCategoryTab === 'tactical';
  drawButton(
    isTac ? '🎯 [ TACTICAL OPERATIVES ]' : '🎯 TACTICAL OPERATIVES',
    tabStartX + tabW + tabGap + tabW / 2,
    tabY,
    () => {
      if (state.weaponCategoryTab !== 'tactical') {
        state.weaponCategoryTab = 'tactical';
        state.weaponPage = 0;
      }
    },
    tabW,
    tabH,
    isTac ? '#f59e0b' : null,
    4
  );

  const cardX = Math.max(16, (canvas.width - 508) / 2);
  const cardW = Math.min(canvas.width - 32, 508);
  const cardH = 118;
  const cardSpacing = 10;
  const itemsPerPage = 5;

  const activeDefs = (state.weaponCategoryTab === 'tactical') ? TACTICAL_FIGHTER_DEFS : FIGHTER_DEFS;

  const totalPages = Math.max(1, Math.ceil(activeDefs.length / itemsPerPage));
  if (state.weaponPage === undefined) state.weaponPage = 0;
  if (state.weaponPage >= totalPages) state.weaponPage = totalPages - 1;
  if (state.weaponPage < 0) state.weaponPage = 0;

  const startIdx = state.weaponPage * itemsPerPage;
  const pageItems = activeDefs.slice(startIdx, startIdx + itemsPerPage);

  const startY = 124;

  pageItems.forEach((def, pos) => {
    const idx = startIdx + pos;
    const cardY = startY + pos * (cardH + cardSpacing);
    const weaponInfo = getFighterWeaponInfo(def);

    // Tactical Chamfered Panel
    drawPanel(cardX, cardY, cardW, cardH, 0.92, 8);

    // Left Accent Pip Line
    ctx.fillStyle = def.color || '#f59e0b';
    ctx.fillRect(cardX + 2, cardY + 12, 3, cardH - 24);

    // 1. Fighter Avatar Preview (Left Circular Stage)
    const avatarX = cardX + 38;
    const avatarY = cardY + cardH / 2;
    const avatarR = 24;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = def.color || 'rgba(245, 158, 11, 0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(avatarX, avatarY + 18, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const previewImg = getFighterPreview(idx);
    if (previewImg) {
      ctx.drawImage(previewImg, avatarX - avatarR, avatarY - avatarR, avatarR * 2, avatarR * 2);
    } else {
      ctx.fillStyle = def.color || '#f59e0b';
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, avatarR * 0.85, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Center Text Layout (Fighter & Weapon Telemetry)
    const textStartX = cardX + 74;
    const textMaxW = cardW - 190;

    // Fighter Name
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 15px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const cleanName = fitSingleLineText(ctx, def.name.toUpperCase(), textMaxW);
    ctx.fillText(cleanName, textStartX, cardY + 14);

    // Weapon Designation & Category
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 10px "Rajdhani", sans-serif';
    const cleanWpn = fitSingleLineText(ctx, `WEAPON // ${weaponInfo.name}`, textMaxW);
    ctx.fillText(cleanWpn, textStartX, cardY + 34);

    ctx.fillStyle = '#64748b';
    ctx.font = '900 8.5px "Rajdhani", sans-serif';
    ctx.fillText(`[ ${weaponInfo.category} // ${(def.category || 'COMBATANT').toUpperCase()} ]`, textStartX, cardY + 48);

    // Description snippet
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Rajdhani", Arial, sans-serif';
    wrapText(ctx, weaponInfo.desc, textStartX, cardY + 63, textMaxW, 12, 2);

    // Quick Telemetry Badges (Bottom Line)
    ctx.fillStyle = '#38bdf8';
    ctx.font = '900 8.5px "Rajdhani", monospace';
    ctx.fillText(`HP ${def.hp || 100} • DMG ${def.damage || 10} • SPD ${(def.moveSpeed || 5).toFixed(1)}`, textStartX, cardY + 96);

    // 3. Right Weapon Preview Stage Pedestal
    const previewSize = 84;
    const previewX = cardX + cardW - previewSize / 2 - 14;
    const previewY = cardY + cardH / 2;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(previewX, previewY + 22, previewSize * 0.44, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(previewX, previewY);
    ctx.scale(0.70, 0.70);
    ctx.translate(0, Math.sin(Date.now() / 300 + idx) * 3);
    drawWeaponPreview(ctx, def.type, def.color);
    ctx.restore();

    // Make card clickable
    _registerButton(cardX, cardY, cardW, cardH, () => {
      state.selectedWeapon = def;
      state.reviewTab = state.reviewTab || 'model';
      state.modelAngle = 0;
      state.modelZoom = 2.2;
      state.modelAutoSpin = false;
      state.showWeaponModel = true;
      state.showSummonModel = false;
      state.showSkinOnly = false;
      state.hideDenjiChainsaws = false;
      state.skillDemoSpeed = 1.0;
      state.skillDemoPaused = false;
      _reviewDummy.reset();
      _reviewParticles = [];
      _reviewDamageTexts = [];
      _reviewProjectiles = [];
      state.previewFighter = null;
      state.gameState = 'weaponDetail';
    });
  });

  // Pagination Controls Bar
  const navY = startY + itemsPerPage * (cardH + cardSpacing) + 2;
  const navBtnW = 90;
  const navBtnH = 30;
  const navBtnCenterY = navY + navBtnH / 2;

  // Previous Page Button
  const prevBtnCenterX = cardX + navBtnW / 2;
  if (state.weaponPage > 0) {
    drawButton('◄ PREV', prevBtnCenterX, navBtnCenterY, () => {
      state.weaponPage--;
    }, navBtnW, navBtnH, null, 4);
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, cardX, navY, navBtnW, navBtnH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '900 10px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◄ PREV', prevBtnCenterX, navBtnCenterY);
  }

  // Page Indicator Badge
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 11.5px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`PAGE ${state.weaponPage + 1} / ${totalPages}`, cardX + cardW / 2, navBtnCenterY);

  // Next Page Button
  const nextBtnLeftX = cardX + cardW - navBtnW;
  const nextBtnCenterX = nextBtnLeftX + navBtnW / 2;
  if (state.weaponPage < totalPages - 1) {
    drawButton('NEXT ►', nextBtnCenterX, navBtnCenterY, () => {
      state.weaponPage++;
    }, navBtnW, navBtnH, null, 4);
  } else {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, nextBtnLeftX, navY, navBtnW, navBtnH, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '900 10px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEXT ►', nextBtnCenterX, navBtnCenterY);
  }

  drawButton('⌂ BACK TO MENU', canvas.width / 2, canvas.height - 36, () => { goToTitle(); }, 140, 30, null, 4);
}

// ─────────────────────────────────────────────
// 2. COMBAT & SKILL ANIMATION DISPATCH ENGINE
// ─────────────────────────────────────────────

function isFighterDemoAttacking(fighter) {
  if (!fighter) return false;
  return (
    (fighter.spearSwingTimer > 0) ||
    (fighter.katanaSlashTimer > 0) ||
    (fighter.punchAnimTimer > 0) ||
    (fighter.meleeSwingTimer > 0) ||
    (fighter.slashGlowTimer > 0) ||
    (fighter.isSlashing && fighter.slashSwingTimer > 0) ||
    (fighter.isCleaving === true) ||
    (fighter.uziFlashTimerFront > 0) ||
    (fighter.uziRecoilFront > 0) ||
    (fighter.minigunFlashTimer > 0) ||
    (fighter.minigunRecoil > 0) ||
    (fighter.muzzleFlashTimer > 0) ||
    (fighter.gunRecoil > 0) ||
    (fighter.pumpTimer > 0) ||
    (fighter.burstShotsRemaining > 0) ||
    (fighter.meleeCooldown > (fighter.meleeCooldownMax - 15))
  );
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

  if (typeof fighter.triggerDemoAttack === 'function') {
    fighter.triggerDemoAttack();
  } else {
    fighter.punchAnimTimer = 16;
    fighter.katanaSlashTimer = 20;
    fighter.spearSwingTimer = 18;
    fighter.slashSwingTimer = 16;
    fighter.isSlashing = true;
    fighter.muzzleFlashTimer = 6;
    fighter.gunRecoil = 1.0;
  }
}

function triggerReviewSkill(skillType, def, fighter, dummy) {
  if (!fighter || !dummy) return;
  _reviewActiveSkill = skillType;
  _reviewSkillTimer = 30;
  _reviewSkillMaxTimer = 30;

  const dx = dummy.x - fighter.x;
  const dy = dummy.y - fighter.y;
  const dist = Math.hypot(dx, dy) || 1;
  const dirX = dx / dist;
  const dirY = dy / dist;

  fighter.gunAngle = Math.atan2(dy, dx);
  fighter.angle = fighter.gunAngle;

  const dmgBase = def.damage || 15;

  if (skillType === 'basic') {
    triggerWeaponDemoAttack(def);
    try {
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.8);
      }
    } catch (e) {}

    setTimeout(() => {
      dummy.takeDamage(dmgBase);
      dummy.applyKnockback(dirX * 6, dirY * 6);
      spawnReviewImpactSparks(dummy.x, dummy.y, def.color || '#f59e0b', 10);
      spawnReviewDamageText(dummy.x, dummy.y - dummy.r - 8, `-${dmgBase}`, '#ffffff');
    }, 120);

  } else if (skillType === 'skill1') {
    _reviewSkillTimer = 45;
    _reviewSkillMaxTimer = 45;

    if (def.type === 'gojo') {
      fighter.redCooldown = 0;
      spawnReviewDamageText(fighter.x, fighter.y - fighter.r - 12, 'REVERSAL RED!', '#ff3b30');
      try { audioSystem.playSFX('Assets/Sound Effects/Skills/redblast.mp3', 0.9); } catch (e) {}
      _reviewProjectiles.push({
        x: fighter.x + dirX * 30,
        y: fighter.y + dirY * 30,
        vx: dirX * 10,
        vy: dirY * 10,
        r: 12,
        color: '#ff3b30',
        type: 'red',
        life: 30
      });
    } else if (def.type === 'sukuna') {
      spawnReviewDamageText(fighter.x, fighter.y - fighter.r - 12, 'DISMANTLE!', '#ef4444');
      try { audioSystem.playSFX('Assets/Sound Effects/Attacks/swordswing.mp3', 0.9); } catch (e) {}
      for (let i = -1; i <= 1; i++) {
        _reviewProjectiles.push({
          x: fighter.x + dirX * 25,
          y: fighter.y + dirY * 25 + i * 15,
          vx: dirX * 14,
          vy: dirY * 14,
          r: 8,
          color: '#ef4444',
          type: 'slash',
          life: 25
        });
      }
    } else if (def.type === 'ichigo') {
      fighter.katanaSlashTimer = 26;
      spawnReviewDamageText(fighter.x, fighter.y - fighter.r - 12, 'GETSUGA TENSHO!', '#38bdf8');
      try { audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.9); } catch (e) {}
      _reviewProjectiles.push({
        x: fighter.x + dirX * 35,
        y: fighter.y + dirY * 35,
        vx: dirX * 12,
        vy: dirY * 12,
        r: 20,
        color: '#38bdf8',
        type: 'getsuga',
        life: 35
      });
    } else if (def.type === 'ulquiorra') {
      spawnReviewDamageText(fighter.x, fighter.y - fighter.r - 12, 'CERO OSCURAS!', '#10b981');
      try { audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.9); } catch (e) {}
      _reviewProjectiles.push({
        x: fighter.x + dirX * 30,
        y: fighter.y + dirY * 30,
        vx: dirX * 15,
        vy: dirY * 15,
        r: 16,
        color: '#10b981',
        type: 'cero',
        life: 25
      });
    } else if (def.type === 'layla') {
      spawnReviewDamageText(fighter.x, fighter.y - fighter.r - 12, 'MALEFIC BOMB!', '#00e5ff');
      try { audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.85); } catch (e) {}
      _reviewProjectiles.push({
        x: fighter.x + dirX * 30,
        y: fighter.y + dirY * 30,
        vx: dirX * 8,
        vy: dirY * 8,
        r: 14,
        color: '#00e5ff',
        type: 'bomb',
        life: 40
      });
    } else if (def.type === 'cj') {
      spawnReviewDamageText(fighter.x, fighter.y - fighter.r - 12, 'DUAL UZI SPRAY!', '#22c55e');
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          _reviewProjectiles.push({
            x: fighter.x + dirX * 25,
            y: fighter.y + dirY * 25 + (Math.random() - 0.5) * 12,
            vx: dirX * 16,
            vy: dirY * 16,
            r: 3,
            color: '#fbbf24',
            type: 'bullet',
            life: 20
          });
          try { audioSystem.playSFX('Assets/Sound Effects/Skills/johnwick-m4-shot.mp3', 0.7); } catch (e) {}
        }, i * 40);
      }
    } else {
      fighter.katanaSlashTimer = 22;
      fighter.punchAnimTimer = 18;
      spawnReviewDamageText(fighter.x, fighter.y - fighter.r - 12, `${(def.ability || 'SPECIAL SKILL').toUpperCase()}!`, def.color || '#f59e0b');
      try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.9); } catch (e) {}
      _reviewProjectiles.push({
        x: fighter.x + dirX * 30,
        y: fighter.y + dirY * 30,
        vx: dirX * 11,
        vy: dirY * 11,
        r: 12,
        color: def.color || '#f59e0b',
        type: 'pulse',
        life: 30
      });
    }

  } else if (skillType === 'ultimate') {
    _reviewSkillTimer = 70;
    _reviewSkillMaxTimer = 70;

    if (def.type === 'gojo') {
      spawnReviewDamageText(fighter.x, fighter.y - fighter.r - 16, '200% HOLLOW PURPLE!', '#a855f7');
      dummy.applyTimeStop(60);
      try { audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 1.0); } catch (e) {}
      _reviewProjectiles.push({
        x: fighter.x + dirX * 40,
        y: fighter.y + dirY * 40,
        vx: dirX * 9,
        vy: dirY * 9,
        r: 28,
        color: '#a855f7',
        type: 'purple',
        life: 55
      });
    } else if (def.type === 'sukuna') {
      spawnReviewDamageText(fighter.x, fighter.y - fighter.r - 16, 'FUGA // FIRE ARROW!', '#f97316');
      try { audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 1.0); } catch (e) {}
      _reviewProjectiles.push({
        x: fighter.x + dirX * 40,
        y: fighter.y + dirY * 40,
        vx: dirX * 13,
        vy: dirY * 13,
        r: 22,
        color: '#f97316',
        type: 'fuga',
        life: 45
      });
    } else if (def.type === 'toji') {
      spawnReviewDamageText(fighter.x, fighter.y - fighter.r - 16, 'STEALTH AMBUSH FLURRY!', '#a855f7');
      dummy.applyTimeStop(50);
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          dummy.takeDamage(dmgBase * 1.5);
          dummy.applyKnockback((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
          spawnReviewImpactSparks(dummy.x, dummy.y, '#a855f7', 8);
          spawnReviewDamageText(dummy.x, dummy.y - dummy.r - 5, 'CLEAVE!', '#c084fc');
        }, i * 80);
      }
    } else {
      spawnReviewDamageText(fighter.x, fighter.y - fighter.r - 16, 'ULTIMATE BURST!', '#fbbf24');
      try { audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.95); } catch (e) {}
      _reviewProjectiles.push({
        x: fighter.x + dirX * 35,
        y: fighter.y + dirY * 35,
        vx: dirX * 10,
        vy: dirY * 10,
        r: 24,
        color: '#fbbf24',
        type: 'ultimate',
        life: 45
      });
    }

  } else if (skillType === 'dash') {
    _reviewSkillTimer = 25;
    _reviewSkillMaxTimer = 25;
    spawnReviewDamageText(fighter.x, fighter.y - fighter.r - 12, 'SUPERSONIC DASH!', '#38bdf8');
    try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.9); } catch (e) {}

    const startFx = fighter.x;
    const startFy = fighter.y;
    fighter.x += dirX * 90;
    fighter.y += dirY * 90;
    spawnReviewImpactSparks(fighter.x, fighter.y, '#38bdf8', 12);

    setTimeout(() => {
      fighter.x = startFx;
      fighter.y = startFy;
    }, 400);
  }
}

// ─────────────────────────────────────────────
// 3. MULTI-WEAPON & FORM SELECTOR RIBBON
// ─────────────────────────────────────────────

function drawMultiWeaponSwitcher(ctx, def, stageX, stageY, stageW, stageH, currentTab) {
  if (!def) return;
  const barY = (currentTab === 'skills') 
    ? (stageY + 44) 
    : (stageY + stageH - 26);
  
  const buttons = [];

  if (def.type === 'toji') {
    state.tojiWeaponIndex = state.tojiWeaponIndex || 0;
    buttons.push({
      text: '🗡️ INVERTED SPEAR',
      active: state.tojiWeaponIndex === 0,
      width: 150,
      action: () => {
        state.tojiWeaponIndex = 0;
        if (state.previewFighter) state.previewFighter.tojiWeaponIndex = 0;
        try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85); } catch (e) {}
      }
    });
    buttons.push({
      text: '⚔️ SPLIT SOUL KATANA',
      active: state.tojiWeaponIndex === 1,
      width: 165,
      action: () => {
        state.tojiWeaponIndex = 1;
        if (state.previewFighter) state.previewFighter.tojiWeaponIndex = 1;
        try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85); } catch (e) {}
      }
    });
  } else if (def.type === 'john_wick' || def.type === 'johnwick') {
    state.johnWickWeaponIndex = state.johnWickWeaponIndex || 0;
    const wList = [
      { name: '🔫 PIT VIPER 9MM', wpn: 'pistol', pencil: false, w: 120 },
      { name: '💥 BENELLI M4', wpn: 'shotgun', pencil: false, w: 110 },
      { name: '🎯 M4A1 CARBINE', wpn: 'rifle', pencil: false, w: 115 },
      { name: '✏️ NO. 2 PENCIL', wpn: 'pistol', pencil: true, w: 110 },
    ];
    wList.forEach((wItem, idx) => {
      buttons.push({
        text: wItem.name,
        active: state.johnWickWeaponIndex === idx,
        width: wItem.w,
        action: () => {
          state.johnWickWeaponIndex = idx;
          if (state.previewFighter) {
            state.previewFighter.currentEquippedWeapon = wItem.wpn;
            state.previewFighter.isPencilEquipped = wItem.pencil;
          }
          try { audioSystem.playSFX('Assets/Sound Effects/Skills/johnwick-gunswitch.mp3', 0.9); } catch (e) {}
        }
      });
    });
  } else if (def.type === 'cj') {
    state.cjWeaponIndex = state.cjWeaponIndex || 0;
    const cjList = [
      { name: '🥊 BRASS KNUCKLES', w: 125 },
      { name: '🚀 JETPACK', w: 85 },
      { name: '🔫 MICRO-UZI', w: 95 },
      { name: '⚙️ MINIGUN', w: 85 },
      { name: '💥 TEC-9', w: 75 }
    ];
    cjList.forEach((cItem, idx) => {
      buttons.push({
        text: cItem.name,
        active: state.cjWeaponIndex === idx,
        width: cItem.w,
        action: () => {
          state.cjWeaponIndex = idx;
          if (state.previewFighter) {
            state.previewFighter.previewWeaponIndex = idx;
            state.previewFighter.z = (idx === 1 || idx === 2) ? 24 : 0;
            state.previewFighter.isJetpackActive = (idx === 1 || idx === 2);
            state.previewFighter.isBaguvixActive = (idx === 3);
            state.previewFighter.isGodModeActive = (idx === 3);
            state.previewFighter.isTec9Active = (idx === 4);
          }
          try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85); } catch (e) {}
        }
      });
    });
  } else if (def.type === 'ichigo') {
    const isShikai = (state.selectedIchigoSkin !== 'bankai');
    const isMask = Boolean(state.showHollowMask);
    buttons.push({
      text: '⚔️ SHIKAI',
      active: isShikai,
      width: 85,
      action: () => {
        state.selectedIchigoSkin = 'shikai';
        if (state.previewFighter) state.previewFighter.skin = 'shikai';
      }
    });
    buttons.push({
      text: '🗡️ BANKAI',
      active: !isShikai,
      width: 85,
      action: () => {
        state.selectedIchigoSkin = 'bankai';
        if (state.previewFighter) state.previewFighter.skin = 'bankai';
      }
    });
    buttons.push({
      text: isMask ? '🎭 MASK: ON' : '🎭 MASK: OFF',
      active: isMask,
      width: 105,
      action: () => {
        state.showHollowMask = !state.showHollowMask;
        if (state.previewFighter) {
          state.previewFighter.hollowMaskActive = state.showHollowMask;
          state.previewFighter.demoShatterTimer = 0;
        }
        try { audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.85); } catch (e) {}
      }
    });
    buttons.push({
      text: '💥 SHATTER',
      active: false,
      width: 90,
      action: () => {
        state.showHollowMask = true;
        if (state.previewFighter) {
          state.previewFighter.hollowMaskActive = true;
          state.previewFighter.demoShatterTimer = 75;
        }
      }
    });
  } else if (def.type === 'ulquiorra') {
    const isBase = !state.showUlquiorraWings && !state.showUlquiorraSegunda;
    const isStage1 = state.showUlquiorraWings && !state.showUlquiorraSegunda;
    const isSegunda = Boolean(state.showUlquiorraSegunda);

    buttons.push({
      text: '⚔️ BASE FORM',
      active: isBase,
      width: 115,
      action: () => {
        state.showUlquiorraWings = false;
        state.showUlquiorraSegunda = false;
        if (state.previewFighter) {
          state.previewFighter.stage1Active = false;
          state.previewFighter.wingsActive = false;
          state.previewFighter.segundaEtapaActive = false;
          state.previewFighter.isSegundaEtapa = false;
        }
        try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85); } catch (e) {}
      }
    });
    buttons.push({
      text: '🦇 STAGE 1 WINGS',
      active: isStage1,
      width: 135,
      action: () => {
        state.showUlquiorraWings = true;
        state.showUlquiorraSegunda = false;
        if (state.previewFighter) {
          state.previewFighter.stage1Active = true;
          state.previewFighter.wingsActive = true;
          state.previewFighter.segundaEtapaActive = false;
          state.previewFighter.isSegundaEtapa = false;
        }
        try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85); } catch (e) {}
      }
    });
    buttons.push({
      text: '⚡ SEGUNDA ETAPA',
      active: isSegunda,
      width: 135,
      action: () => {
        state.showUlquiorraWings = true;
        state.showUlquiorraSegunda = true;
        if (state.previewFighter) {
          state.previewFighter.stage1Active = true;
          state.previewFighter.wingsActive = true;
          state.previewFighter.segundaEtapaActive = true;
          state.previewFighter.isSegundaEtapa = true;
        }
        try { audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.9); } catch (e) {}
      }
    });
  } else if (def.type === 'megumi') {
    state.megumiWeaponIndex = state.megumiWeaponIndex || 0;
    buttons.push({
      text: '🗡️ SHADOW BLADE',
      active: state.megumiWeaponIndex === 0,
      width: 140,
      action: () => {
        state.megumiWeaponIndex = 0;
        try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85); } catch (e) {}
      }
    });
    buttons.push({
      text: '🐺 TOTALITY CLAWS',
      active: state.megumiWeaponIndex === 1,
      width: 145,
      action: () => {
        state.megumiWeaponIndex = 1;
        try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85); } catch (e) {}
      }
    });
  } else if (def.type === 'reze') {
    const isHybrid = Boolean(state.showRezeTransformation);
    buttons.push({
      text: '🌸 HUMAN FORM',
      active: !isHybrid,
      width: 130,
      action: () => {
        state.showRezeTransformation = false;
        if (state.previewFighter) {
          state.previewFighter.isHybridModeActive = false;
        }
        try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85); } catch (e) {}
      }
    });
    buttons.push({
      text: '💣 BOMB DEVIL',
      active: isHybrid,
      width: 130,
      action: () => {
        state.showRezeTransformation = true;
        if (state.previewFighter) {
          state.previewFighter.isHybridModeActive = true;
        }
        try {
          audioSystem.playSFX('Assets/Sound Effects/Skills/parry.mp3', 0.95);
        } catch (e) {}
      }
    });
  } else if (def.type === 'denji') {
    // Denji is permanently in Chainsaw Devil form — no human form toggle
    const isChainsawHidden = Boolean(state.hideDenjiChainsaws);
    buttons.push({
      text: isChainsawHidden ? '🪚 SHOW CHAINSAW' : '🚫 HIDE CHAINSAW',
      active: isChainsawHidden,
      width: 140,
      action: () => {
        state.hideDenjiChainsaws = !state.hideDenjiChainsaws;
        if (state.previewFighter) {
          state.previewFighter.hideChainsaws = state.hideDenjiChainsaws;
          state.previewFighter.hideHands = state.hideDenjiChainsaws;
          state.previewFighter.hideFrontHand = state.hideDenjiChainsaws;
          state.previewFighter.hideBackHand = state.hideDenjiChainsaws;
        }
        try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85); } catch (e) {}
      }
    });
  } else if (def.type === 'power') {
    state.powerWeaponIndex = state.powerWeaponIndex || 0;
    buttons.push({
      text: '🔨 BLOOD HAMMER',
      active: state.powerWeaponIndex === 0,
      width: 135,
      action: () => {
        state.powerWeaponIndex = 0;
        try { audioSystem.playSFX('Assets/Sound Effects/Skills/parry.mp3', 0.85); } catch (e) {}
      }
    });
    buttons.push({
      text: '🗡️ BLOOD SCYTHE',
      active: state.powerWeaponIndex === 1,
      width: 135,
      action: () => {
        state.powerWeaponIndex = 1;
        try { audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85); } catch (e) {}
      }
    });
  }

  if (buttons.length === 0) return;

  const totalBtnWidth = buttons.reduce((acc, b) => acc + b.width, 0);
  const gap = 6;
  const totalRowW = totalBtnWidth + (buttons.length - 1) * gap;
  let currentBtnX = (state.canvas.width - totalRowW) / 2;

  buttons.forEach(btn => {
    drawButton(
      btn.text,
      currentBtnX + btn.width / 2,
      barY,
      btn.action,
      btn.width,
      22,
      btn.active ? '#f59e0b' : null,
      3
    );
    currentBtnX += btn.width + gap;
  });
}

// ─────────────────────────────────────────────
// 4. TECHNICAL DOSSIER CARD COMPONENT
// ─────────────────────────────────────────────

function drawWeaponInfoCard(ctx, def) {
  const { canvas } = state;
  const containerW = canvas.width - 32;
  const containerX = 16;
  const panelY = 478;
  const panelH = 410;

  let nameText = def.name;
  let descText = def.desc;

  if (def.type === 'rifle' || def.type === 'm4a1') {
    nameText = 'M4A1 5.56mm Tactical Assault Carbine';
    descText = 'Elite 5.56×45mm NATO assault carbine. Features a 6-position collapsible LE stock, flat-top Picatinny rail with CompM4 red-dot sight, ribbed cylindrical handguard with cooling vents, triangular front sight, and 30-round PMAG. Unleashes rapid, deadly 3-round bursts with balanced recoil.';
  } else if (def.type === 'shotgun' || def.type === 'spas12' || def.type === 'spas_12') {
    nameText = 'SPAS-12 12-Gauge Tactical Combat Shotgun';
    descText = 'Heavy 12-gauge close-quarters entry weapon. Features twin telescoping stock rods, top Picatinny rail, ghost ring sights, ventilated heat shield, and sliding pump forend. Fires lethal 6-pellet buckshot spreads with authentic post-shot pump racking and chamber ejection.';
  } else if (def.type === 'pistol' || def.type === 'desert_eagle' || def.type === 'deserteagle') {
    nameText = 'Magnum Research Desert Eagle .50 AE';
    descText = 'High-caliber .50 Action Express hand cannon. Features full-length top/bottom Picatinny rails, ambidextrous safety with red fire dot, cocked spur hammer, extended beavertail, ergonomic wrap-around grip, and slide blowback exposing the chrome barrel chamber.';
  } else if (def.type === 'sniper' || def.type === 'awp') {
    nameText = 'Accuracy International Arctic Warfare AWP .338';
    descText = 'Precision .338 Lapua Magnum sniper rifle. Features iconic thumbhole polymer chassis, stepped rubber recoil buttpad, adjustable cheek riser, assembly hex bolts, 50mm high-magnification scope, and heavy manual bolt-action chambering.';
  } else if (def.type === 'ichigo') {
    const skin = state.selectedIchigoSkin || 'shikai';
    const isMask = Boolean(state.showHollowMask);
    if (skin === 'shikai') {
      nameText = isMask ? 'Ichigo (Shikai + Hollow Mask)' : 'Ichigo (Shikai Zangetsu)';
      descText = isMask
        ? 'Empowered with the Visored Hollow Mask! Boosts spiritual pressure, movement velocity, and unleashes enhanced Getsuga waves with black-crimson spiritual pressure.'
        : 'Wields massive oversized Shikai Zangetsu with trailing white cloth ribbons. Unleashes high-density Getsuga Tensho crescent waves, 2-strike Shunpo flurry, and Hollow Mask under 30% HP. Bankai unleashes Tensa Zangetsu!';
    } else {
      nameText = isMask ? 'Ichigo (Bankai + Hollow Mask)' : 'Ichigo (Bankai: Tensa Zangetsu)';
      descText = isMask
        ? 'Bankai augmented by the Visored Hollow Mask! Unleashes supersonic 6-strike Shunpo blazes and devastating Kuroi Getsuga crescent arcs.'
        : 'Wields sleek Kurotsuba Tensa Zangetsu with high-frequency frontal-arc slashes. Fires Kuroi Getsuga waves and dashes with supersonic Shunpo flurries.';
    }
  }

  if (def.type === 'john_wick' || def.type === 'johnwick') {
    const activeIndex = (state.gameState === 'weaponDetail') ? (state.johnWickWeaponIndex || 0) : 0;
    if (activeIndex === 0) {
      nameText = 'TTI Pit Viper 9mm Combat Master';
      descText = 'Customized match-grade 9mm sidearm with compensator. Fires 12 high-velocity match rounds before entering the lethal 5-phase Gun-Fu close-quarters combo.';
    } else if (activeIndex === 1) {
      nameText = 'Benelli M4 Super 90 Tactical Shotgun';
      descText = 'Tactical semi-auto shotgun with dynamic pump-action racking. Fires 6 heavy buckshot spread blasts dealing massive close-range physical knockback.';
    } else if (activeIndex === 2) {
      nameText = 'M4A1 Tactical Carbine Assault Rifle';
      descText = 'Military carbine with carrying handle, ribbed handguard, and 30-round curved magazine. Fires 30 rapid-fire supersonic 5.56 green-tip armor-piercing tracer rounds.';
    } else {
      nameText = 'Sharpened No. 2 Cedar Graphite Pencil';
      descText = 'Legendary sharpened No. 2 cedar graphite pencil in reverse tactical grip during assassination grab-and-stab executions, inflicting stacking bleed damage.';
    }
  }

  if (def.type === 'ulquiorra' || def.type === 'ulquiorra_cifer') {
    const isWings = Boolean(state.showUlquiorraWings);
    const isSegunda = Boolean(state.showUlquiorraSegunda);
    if (isSegunda) {
      nameText = 'Ulquiorra (Resurrección: Segunda Etapa)';
      descText = 'The terrifying second release of the Cuatro Espada. Spawns massive demonic bat wings, a razor whip tail, and pitch-black claws. Wields Lanza del Relámpago—a Reishi plasma lightning javelin that causes colossal nuclear Reishi explosions.';
    } else if (isWings) {
      nameText = 'Ulquiorra (Resurrección: Murciélago)';
      descText = 'Unleashes the Great Bat Resurrección release: "Enclose, Murciélago!" Spawns giant black leathery bat wings with Reishi flutters, enhances Sonído speed, and converts basic slashes into high-density emerald crescent waves.';
    } else {
      nameText = 'Murciélago (Ulquiorra Katana)';
      descText = 'Standard katana form of the Cuatro Espada with green tsuka-ito wrap and 4-corner flared Espada tsuba. Delivers swift Reishi-infused katana slashes, Bala pulses, high-speed Sonído dashes, and Hierro armor.';
    }
  }

  if (def.type === 'reze') {
    const isHybrid = Boolean(state.showRezeTransformation);
    if (isHybrid) {
      nameText = 'Reze (Bomb Devil Hybrid Form)';
      descText = 'The Bomb Devil awakened! Reze pulls her collar pin, transforming her head into a living torpedo atomic warhead with dynamite bandoliers. Gains supersonic propulsion speed, increased blast punch radius, and unleashes the apocalyptic Megaton Tsar Nuke.';
    } else {
      nameText = 'Reze (Soviet Assassin)';
      descText = 'The charming Soviet assassin. Armed with detonating martial arts punches, high-velocity Spark Flechette spread shots, explosive Decoy Clones, and supersonic Rocket Lunges. Pulling her collar pin triggers an explosive radial revive into Bomb Devil form.';
    }
  }

  if (def.type === 'cj') {
    const activeIndex = (state.gameState === 'weaponDetail') ? (state.cjWeaponIndex || 0) : 0;
    if (activeIndex === 0) {
      nameText = 'Authentic Cast-Brass Knuckles';
      descText = 'Heavy metallic 4-ring cast-brass knuckles for rapid-fire street boxing CQC. Delivers heavy kinetic staggering blows, liver hooks, and builds RESPECT+ with every hit.';
    } else if (activeIndex === 1) {
      nameText = 'Military Jetpack (Easy Jet / ROCKETMAN)';
      descText = 'Iconic GTA: San Andreas Jetpack. Features a matte industrial silver & brushed aluminum frame with structural welds, dual vertical muted olive-drab fuel tanks strapped with dark canvas & heavy buckles, dark charcoal burnt-metal nozzles, and dark-tan leather harness straps. Grants 360° omni-directional flight.';
    } else if (activeIndex === 2) {
      nameText = 'Micro SMG (IMI Micro-Uzi)';
      descText = 'Iconic GTA: San Andreas Micro SMG. Features matte gunmetal gray steel with industrial metallic reflections, molded dark charcoal polymer furniture, and stamped sheet metal sights. Dual-wielded during Jetpack flight at 12 rounds/sec.';
    } else if (activeIndex === 3) {
      nameText = 'M134 Minigun (Vulcan / BAGUVIX)';
      descText = 'Iconic GTA: San Andreas Minigun. Features matte military olive drab housing, charcoal steel reinforcement plates, polished steel barrels with metallic blue-gray sheen and burnt tips, rubberized canvas ammo feed chute, and metallic silver hardware. Unleashes 45 rounds/sec during BAGUVIX God Mode.';
    } else {
      nameText = 'TEC-9 (Intratec / GROVESTREET4LIFE)';
      descText = 'Iconic GTA: San Andreas TEC-9. Features a worn matte gunmetal gray receiver with stamped weld lines, molded dark charcoal polymer lower frame & grip, and contrasting matte black barrel shroud with cooling perforations. Wielded during Grove Street Drive-Bys.';
    }
  }

  // Tactical Chamfered Panel
  drawPanel(containerX, panelY, containerW, panelH, 0.94, 8);

  // Top Accent Line
  ctx.fillStyle = def.color || '#f59e0b';
  ctx.fillRect(containerX + 16, panelY + 2, containerW - 32, 2);

  // Header: Name & Type
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 19px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const cleanHeader = fitSingleLineText(ctx, nameText.toUpperCase(), containerW - 36);
  ctx.fillText(cleanHeader, containerX + 18, panelY + 16);

  ctx.fillStyle = '#64748b';
  ctx.font = '900 9.5px "Rajdhani", sans-serif';
  ctx.fillText(`CLASSIFICATION // ${(def.category || 'ARSENAL').toUpperCase()}  •  MODEL // ${def.type.toUpperCase()}`, containerX + 18, panelY + 38);

  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 11px "Rajdhani", sans-serif';
  ctx.fillText(`SIGNATURE ABILITY // ${(def.ability || 'SPECIAL WEAPON').toUpperCase()}`, containerX + 18, panelY + 56);

  // Telemetry Bars Deck inside Dossier (4 Full-Width Stat Bars)
  let statY = panelY + 80;
  const statW = containerW - 36;

  drawStatBar(ctx, 'HP BONUS', def.hp || 100, 150, containerX + 18, statY, statW, '#dc2626');
  statY += 24;
  drawStatBar(ctx, 'CALIBRATED DAMAGE', def.damage || 10, 60, containerX + 18, statY, statW, '#f59e0b');
  statY += 24;
  drawStatBar(ctx, 'TACTICAL SPEED', (def.moveSpeed || 5).toFixed(1), 10, containerX + 18, statY, statW, '#94a3b8');
  statY += 24;

  if (def.type === 'mahito') {
    const baseReach = CONFIG.mahito?.punchRange || 75;
    const bodyR = def.radius || 25;
    drawStatBar(ctx, 'BLADE REACH', `${bodyR + baseReach}px`, 200, containerX + 18, statY, statW, '#f59e0b');
    statY += 24;
  } else if (def.type === 'nanami') {
    const baseReach = CONFIG.nanami?.cleaverRange || 65;
    const bodyR = def.radius || 25;
    drawStatBar(ctx, 'BLADE REACH', `${bodyR + baseReach}px`, 200, containerX + 18, statY, statW, '#f59e0b');
    statY += 24;
  } else {
    drawStatBar(ctx, 'CADENCE', `${((def.cooldown || 60) / 60).toFixed(1)}s`, 2.0, containerX + 18, statY, statW, '#94a3b8');
    statY += 24;
  }

  // Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(containerX + 18, statY + 4);
  ctx.lineTo(containerX + containerW - 18, statY + 4);
  ctx.stroke();

  // Technical Dossier & Combat Mechanics
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 10px "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('TECHNICAL SPECIFICATIONS & COMBAT MECHANICS //', containerX + 18, statY + 14);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10.5px "Rajdhani", Arial, sans-serif';
  wrapText(ctx, descText || '', containerX + 18, statY + 32, containerW - 36, 14.5);
}

// ─────────────────────────────────────────────
// 5. UNIFIED FIGHTER & WEAPON REVIEW STUDIO SCREEN
// ─────────────────────────────────────────────

function drawWeaponDetailScreen() {
  const { ctx, canvas } = state;
  const def = state.selectedWeapon;
  if (!def) {
    state.gameState = 'weapons';
    return;
  }

  const hasSummon = ['yuta', 'doppleganger', 'Engineer', 'black'].includes(def.type);

  if (state.reviewTab === undefined) state.reviewTab = 'model';
  if (state.modelAngle === undefined) state.modelAngle = 0;
  if (state.modelZoom === undefined) state.modelZoom = 2.2;
  if (state.skillDemoSpeed === undefined) state.skillDemoSpeed = 1.0;

  // Reset context to prevent leaks
  ctx.resetTransform();
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;

  _clearButtons();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sleek Dark Gunmetal Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, '#07080c');
  bgGrad.addColorStop(0.5, '#10131c');
  bgGrad.addColorStop(1, '#07080c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ── Tier 1: Header Bar (Y: 58) ──
  const navY = 58; 
  drawButton('← ROSTER', 58, navY, () => {
    state.gameState = 'weapons';
  }, 85, 24, null, 4);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('[ FIGHTER & WEAPON REVIEW ]', canvas.width / 2, navY);
  ctx.restore();

  const activeList = TACTICAL_FIGHTER_DEFS.some(f => f.type === def.type) ? TACTICAL_FIGHTER_DEFS : FIGHTER_DEFS;
  const currentIdx = activeList.findIndex(f => f.type === def.type);
  if (currentIdx > 0) {
    drawButton('◄ PREV', canvas.width - 95, navY, () => {
      state.selectedWeapon = activeList[currentIdx - 1];
      state.previewFighter = null;
      _reviewDummy.reset();
    }, 55, 24, null, 3);
  }
  if (currentIdx < activeList.length - 1) {
    drawButton('NEXT ►', canvas.width - 34, navY, () => {
      state.selectedWeapon = activeList[currentIdx + 1];
      state.previewFighter = null;
      _reviewDummy.reset();
    }, 55, 24, null, 3);
  }

  // ── Tier 1b: 3-Pillar Review Mode Tabs (Y: 88) ──
  const actionY = 88;
  const pillarW = 150;
  const pillarH = 24;
  const pillarGap = 8;
  const totalPillarW = pillarW * 3 + pillarGap * 2;
  const pillarStartX = (canvas.width - totalPillarW) / 2;

  // Pillar 1: Model
  const isModelTab = (state.reviewTab === 'model');
  drawButton(
    isModelTab ? '🥋 [ FIGHTER MODEL ]' : '🥋 FIGHTER MODEL',
    pillarStartX + pillarW / 2,
    actionY,
    () => { state.reviewTab = 'model'; },
    pillarW,
    pillarH,
    isModelTab ? '#f59e0b' : null,
    4
  );

  // Pillar 2: Skills
  const isSkillsTab = (state.reviewTab === 'skills');
  drawButton(
    isSkillsTab ? '⚡ [ SKILL ANIMATIONS ]' : '⚡ SKILL ANIMATIONS',
    pillarStartX + pillarW + pillarGap + pillarW / 2,
    actionY,
    () => { 
      state.reviewTab = 'skills';
      _reviewDummy.reset();
    },
    pillarW,
    pillarH,
    isSkillsTab ? '#f59e0b' : null,
    4
  );

  // Pillar 3: Weapon
  const isWeaponTab = (state.reviewTab === 'weapon');
  drawButton(
    isWeaponTab ? '⚔️ [ WEAPON ARSENAL ]' : '⚔️ WEAPON ARSENAL',
    pillarStartX + (pillarW + pillarGap) * 2 + pillarW / 2,
    actionY,
    () => { state.reviewTab = 'weapon'; },
    pillarW,
    pillarH,
    isWeaponTab ? '#f59e0b' : null,
    4
  );

  // ── Tier 2: Hero Stage (Y: 110 to 470, H: 360px) ──
  const stageX = 16;
  const stageY = 110;
  const stageW = canvas.width - 32;
  const stageH = 360;
  const heroX = canvas.width / 2;
  const heroY = stageY + 160;

  drawPanel(stageX, stageY, stageW, stageH, 0.94, 8);

  ctx.save();
  ctx.beginPath();
  drawChamferedRect(ctx, stageX + 1, stageY + 1, stageW - 2, stageH - 2, 7);
  ctx.clip();

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(stageX, stageY, stageW, stageH);

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

  // ═════════════════════════════════════════════
  // PILLAR 1: FIGHTER MODEL INSPECTOR
  // ═════════════════════════════════════════════
  if (state.reviewTab === 'model') {
    if (state.modelAutoSpin) {
      state.modelAngle = (state.modelAngle || 0) + 0.02;
    }

    ctx.save();
    ctx.translate(heroX, heroY);
    ctx.scale(state.modelZoom || 2.2, state.modelZoom || 2.2);

    ctx.translate(0, Math.sin(Date.now() / 400) * 4);

    previewFighter.x = 0;
    previewFighter.y = 0;
    previewFighter.gunAngle = state.modelAngle || 0;
    previewFighter.angle = state.modelAngle || 0;

    // Synchronize weapon and form states
    if (def.type === 'ichigo') {
      previewFighter.skin = state.selectedIchigoSkin || 'shikai';
      if (previewFighter.demoShatterTimer > 0) {
        previewFighter.hollowMaskActive = true;
        previewFighter.demoShatterTimer--;
        if (previewFighter.demoShatterTimer <= 0) {
          previewFighter.hollowMaskActive = false;
          state.showHollowMask = false;
          spawnHollowMaskShatter(previewFighter);
        }
      } else {
        previewFighter.hollowMaskActive = Boolean(state.showHollowMask);
      }
    } else if (def.type === 'ulquiorra') {
      previewFighter.stage1Active = Boolean(state.showUlquiorraWings);
      previewFighter.wingsActive = Boolean(state.showUlquiorraWings);
      previewFighter.segundaEtapaActive = Boolean(state.showUlquiorraSegunda);
      previewFighter.isSegundaEtapa = Boolean(state.showUlquiorraSegunda);
    } else if (def.type === 'toji') {
      previewFighter.tojiWeaponIndex = state.tojiWeaponIndex || 0;
    } else if (def.type === 'john_wick' || def.type === 'johnwick') {
      const jIdx = state.johnWickWeaponIndex || 0;
      previewFighter.currentEquippedWeapon = ['pistol', 'shotgun', 'rifle', 'pistol'][jIdx];
      previewFighter.isPencilEquipped = (jIdx === 3);
    } else if (def.type === 'cj') {
      const cjIdx = state.cjWeaponIndex || 0;
      previewFighter.z = (cjIdx === 1 || cjIdx === 2) ? 24 : 0;
      previewFighter.isJetpackActive = (cjIdx === 1 || cjIdx === 2);
      previewFighter.isBaguvixActive = (cjIdx === 3);
      previewFighter.isGodModeActive = (cjIdx === 3);
      previewFighter.isTec9Active = (cjIdx === 4);
      previewFighter.previewWeaponIndex = cjIdx;
    } else if (def.type === 'reze') {
      previewFighter.isHybridModeActive = Boolean(state.showRezeTransformation);
    } else if (def.type === 'denji') {
      previewFighter.isHybridModeActive = true; // Permanently devil form
      previewFighter.hideChainsaws = Boolean(state.hideDenjiChainsaws);
      previewFighter.hideHands = Boolean(state.hideDenjiChainsaws);
      previewFighter.hideFrontHand = Boolean(state.hideDenjiChainsaws);
      previewFighter.hideBackHand = Boolean(state.hideDenjiChainsaws);
    }

    try {
      if (state.showSummonModel && def.type === 'yuta' && previewFighter.rika) {
        previewFighter.rika.active = true;
        previewFighter.rika.x = 0;
        previewFighter.rika.y = 0;
        previewFighter._drawRika(ctx, { x: 100, y: 0 });
      } else if (state.showWeaponOnly) {
        drawWeaponPreview(ctx, def.type, def.color);
      } else {
        const fakeTarget = { x: Math.cos(state.modelAngle) * 80, y: Math.sin(state.modelAngle) * 80, r: 25, hp: 100, maxHp: 100 };
        previewFighter.draw(ctx, fakeTarget);
        updateDeathEffects();
        drawDeathEffects();
      }
    } catch (e) {
      console.error('Model render error:', e);
    }

    ctx.restore();

    // Zoom controls overlay
    const zoomX = stageX + stageW - 32;
    const zoomY = stageY + 36;
    const zoomPct = Math.round(((state.modelZoom || 2.2) / 2.2) * 100);

    drawButton('🔍+', zoomX, zoomY, () => {
      state.modelZoom = Math.min(4.5, (state.modelZoom || 2.2) + 0.3);
    }, 32, 22, null, 2);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 9px "Rajdhani", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${zoomPct}%`, zoomX, zoomY + 20);

    drawButton('🔍-', zoomX, zoomY + 40, () => {
      state.modelZoom = Math.max(1.0, (state.modelZoom || 2.2) - 0.3);
    }, 32, 22, null, 2);

    // Layer Display Modes (Top Left inside Stage)
    const layerY = stageY + 20;
    const isSkinOnly = Boolean(state.showSkinOnly);
    const isWpnOnly = Boolean(state.showWeaponOnly);
    const isFull = !isSkinOnly && !isWpnOnly && !state.showSummonModel;

    drawButton(isFull ? '[ FULL FIGHTER ]' : 'FULL FIGHTER', stageX + 65, layerY, () => {
      state.showSkinOnly = false;
      state.showWeaponOnly = false;
      state.showSummonModel = false;
      state.showWeaponModel = true;
    }, 105, 20, isFull ? '#f59e0b' : null, 2);

    drawButton(isSkinOnly ? '[ SKIN ONLY ]' : 'SKIN ONLY', stageX + 175, layerY, () => {
      state.showSkinOnly = true;
      state.showWeaponOnly = false;
      state.showSummonModel = false;
      state.showWeaponModel = true;
    }, 85, 20, isSkinOnly ? '#f59e0b' : null, 2);

    drawButton(isWpnOnly ? '[ WEAPON ONLY ]' : 'WEAPON ONLY', stageX + 275, layerY, () => {
      state.showSkinOnly = false;
      state.showWeaponOnly = true;
      state.showSummonModel = false;
      state.showWeaponModel = false;
    }, 95, 20, isWpnOnly ? '#f59e0b' : null, 2);

    if (hasSummon) {
      const isSummon = Boolean(state.showSummonModel);
      drawButton(isSummon ? '[ COMPANION ]' : 'COMPANION', stageX + 380, layerY, () => {
        state.showSummonModel = !state.showSummonModel;
        state.showSkinOnly = false;
        state.showWeaponOnly = false;
      }, 90, 20, isSummon ? '#f59e0b' : null, 2);
    }

    // Multi-Weapon & Form Selector Ribbon (Prominent in Model Tab)
    drawMultiWeaponSwitcher(ctx, def, stageX, stageY, stageW, stageH, 'model');

  // ═════════════════════════════════════════════
  // PILLAR 2: SKILL ANIMATION STUDIO
  // ═════════════════════════════════════════════
  } else if (state.reviewTab === 'skills') {
    const arenaX = stageX + 6;
    const arenaY = stageY + 36;
    const arenaW = stageW - 12;
    const arenaH = stageH - 76;

    const fighterHomeX = arenaX + 90;
    const fighterHomeY = arenaY + arenaH / 2;
    _reviewDummy.homeX = arenaX + arenaW - 90;
    _reviewDummy.homeY = arenaY + arenaH / 2;

    if (_reviewDummy.x === 0 && _reviewDummy.y === 0) {
      _reviewDummy.x = _reviewDummy.homeX;
      _reviewDummy.y = _reviewDummy.homeY;
    }

    previewFighter.x = fighterHomeX;
    previewFighter.y = fighterHomeY;

    const simSpeed = state.skillDemoPaused ? (_reviewFrameStepRequested ? 1.0 : 0) : (state.skillDemoSpeed || 1.0);
    _reviewFrameStepRequested = false;

    if (simSpeed > 0) {
      _reviewDummy.vx *= 0.88;
      _reviewDummy.vy *= 0.88;
      _reviewDummy.x += _reviewDummy.vx * simSpeed;
      _reviewDummy.y += _reviewDummy.vy * simSpeed;
      _reviewDummy.x += (_reviewDummy.homeX - _reviewDummy.x) * 0.08 * simSpeed;
      _reviewDummy.y += (_reviewDummy.homeY - _reviewDummy.y) * 0.08 * simSpeed;

      if (_reviewDummy.hitFlash > 0) _reviewDummy.hitFlash -= simSpeed;
      if (_reviewDummy.stasisTimer > 0) _reviewDummy.stasisTimer -= simSpeed;

      for (let i = _reviewProjectiles.length - 1; i >= 0; i--) {
        const p = _reviewProjectiles[i];
        p.x += p.vx * simSpeed;
        p.y += p.vy * simSpeed;
        p.life -= simSpeed;

        const dist = Math.hypot(p.x - _reviewDummy.x, p.y - _reviewDummy.y);
        if (dist < p.r + _reviewDummy.r) {
          _reviewDummy.takeDamage(def.damage * 2 || 35);
          _reviewDummy.applyKnockback(p.vx * 0.5, p.vy * 0.5);
          spawnReviewImpactSparks(_reviewDummy.x, _reviewDummy.y, p.color, 12);
          spawnReviewDamageText(_reviewDummy.x, _reviewDummy.y - _reviewDummy.r - 8, `-${def.damage * 2 || 35}`, p.color);
          _reviewProjectiles.splice(i, 1);
          continue;
        }

        if (p.life <= 0) {
          _reviewProjectiles.splice(i, 1);
        }
      }

      for (let i = _reviewParticles.length - 1; i >= 0; i--) {
        const pt = _reviewParticles[i];
        pt.x += pt.vx * simSpeed;
        pt.y += pt.vy * simSpeed;
        pt.life -= simSpeed;
        if (pt.life <= 0) _reviewParticles.splice(i, 1);
      }

      for (let i = _reviewDamageTexts.length - 1; i >= 0; i--) {
        const dt = _reviewDamageTexts[i];
        dt.y += dt.vy * simSpeed;
        dt.life -= simSpeed;
        if (dt.life <= 0) _reviewDamageTexts.splice(i, 1);
      }
    }

    // Grid background
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    for (let gx = arenaX; gx < arenaX + arenaW; gx += 26) {
      ctx.beginPath();
      ctx.moveTo(gx, arenaY);
      ctx.lineTo(gx, arenaY + arenaH);
      ctx.stroke();
    }
    for (let gy = arenaY; gy < arenaY + arenaH; gy += 26) {
      ctx.beginPath();
      ctx.moveTo(arenaX, gy);
      ctx.lineTo(arenaX + arenaW, gy);
      ctx.stroke();
    }

    previewFighter.aim(_reviewDummy);

    try {
      ctx.save();
      ctx.translate(previewFighter.x, previewFighter.y);
      ctx.scale(1.4, 1.4);
      const localTarget = { x: (_reviewDummy.x - previewFighter.x) / 1.4, y: (_reviewDummy.y - previewFighter.y) / 1.4, r: 22, hp: 100 };
      previewFighter.draw(ctx, localTarget);
      ctx.restore();
    } catch (e) {}

    // Sparring Dummy Target
    ctx.save();
    const isHit = _reviewDummy.hitFlash > 0;
    const isStasis = _reviewDummy.stasisTimer > 0;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(_reviewDummy.x, _reviewDummy.y + 20, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isStasis) {
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(_reviewDummy.x, _reviewDummy.y, 28, 10, Date.now() / 200, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = isHit ? '#ef4444' : '#1e293b';
    ctx.strokeStyle = isHit ? '#ffffff' : '#e2e8f0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(_reviewDummy.x, _reviewDummy.y, _reviewDummy.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = isHit ? '#ffffff' : '#f87171';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(_reviewDummy.x - _reviewDummy.r - 4, _reviewDummy.y);
    ctx.lineTo(_reviewDummy.x + _reviewDummy.r + 4, _reviewDummy.y);
    ctx.moveTo(_reviewDummy.x, _reviewDummy.y - _reviewDummy.r - 4);
    ctx.lineTo(_reviewDummy.x, _reviewDummy.y + _reviewDummy.r + 4);
    ctx.stroke();

    const dummyHpW = 44;
    const dummyHpH = 4;
    const hpPct = Math.max(0, _reviewDummy.hp / _reviewDummy.maxHp);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(_reviewDummy.x - dummyHpW / 2, _reviewDummy.y - _reviewDummy.r - 12, dummyHpW, dummyHpH);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(_reviewDummy.x - dummyHpW / 2, _reviewDummy.y - _reviewDummy.r - 12, dummyHpW * hpPct, dummyHpH);
    ctx.restore();

    _reviewProjectiles.forEach(p => {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    _reviewParticles.forEach(pt => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    _reviewDamageTexts.forEach(dt => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, dt.life / dt.maxLife);
      ctx.fillStyle = dt.color;
      ctx.font = '900 12px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(dt.text, dt.x, dt.y);
      ctx.restore();
    });

    // Playback Speed Controls Bar
    const ctrlY = stageY + 18;
    const isPaused = Boolean(state.skillDemoPaused);
    drawButton(isPaused ? '▶ PLAY' : '⏸ PAUSE', stageX + 50, ctrlY, () => {
      state.skillDemoPaused = !state.skillDemoPaused;
    }, 65, 20, isPaused ? '#10b981' : null, 2);

    if (isPaused) {
      drawButton('⏭ STEP', stageX + 115, ctrlY, () => {
        _reviewFrameStepRequested = true;
      }, 55, 20, null, 2);
    }

    const spd = state.skillDemoSpeed || 1.0;
    drawButton(spd === 0.25 ? '[ 0.25x ]' : '0.25x', stageX + 185, ctrlY, () => { state.skillDemoSpeed = 0.25; state.skillDemoPaused = false; }, 55, 20, spd === 0.25 ? '#f59e0b' : null, 2);
    drawButton(spd === 0.50 ? '[ 0.5x ]' : '0.5x', stageX + 245, ctrlY, () => { state.skillDemoSpeed = 0.50; state.skillDemoPaused = false; }, 48, 20, spd === 0.50 ? '#f59e0b' : null, 2);
    drawButton(spd === 1.00 ? '[ 1.0x ]' : '1.0x', stageX + 300, ctrlY, () => { state.skillDemoSpeed = 1.00; state.skillDemoPaused = false; }, 48, 20, spd === 1.00 ? '#f59e0b' : null, 2);
    drawButton(spd === 2.00 ? '[ 2.0x ]' : '2.0x', stageX + 355, ctrlY, () => { state.skillDemoSpeed = 2.00; state.skillDemoPaused = false; }, 48, 20, spd === 2.00 ? '#f59e0b' : null, 2);

    drawButton('↺ RESET DUMMY', stageX + stageW - 65, ctrlY, () => {
      _reviewDummy.reset();
      _reviewProjectiles = [];
      _reviewParticles = [];
      _reviewDamageTexts = [];
    }, 95, 20, null, 2);

    // Multi-Weapon switcher inside skills tab
    drawMultiWeaponSwitcher(ctx, def, stageX, stageY, stageW, stageH, 'skills');

    // Bottom Skill Trigger Rack
    const rackY = stageY + stageH - 24;
    const btnW = 115;
    const btnGap = 8;
    const rackStartX = (canvas.width - (btnW * 4 + btnGap * 3)) / 2;

    drawButton('⚔️ BASIC ATK', rackStartX + btnW / 2, rackY, () => {
      triggerReviewSkill('basic', def, previewFighter, _reviewDummy);
    }, btnW, 22, null, 3);

    drawButton('✦ SKILL 1', rackStartX + btnW + btnGap + btnW / 2, rackY, () => {
      triggerReviewSkill('skill1', def, previewFighter, _reviewDummy);
    }, btnW, 22, '#38bdf8', 3);

    drawButton('★ ULTIMATE', rackStartX + (btnW + btnGap) * 2 + btnW / 2, rackY, () => {
      triggerReviewSkill('ultimate', def, previewFighter, _reviewDummy);
    }, btnW, 22, '#f59e0b', 3);

    drawButton('💨 DASH', rackStartX + (btnW + btnGap) * 3 + btnW / 2, rackY, () => {
      triggerReviewSkill('dash', def, previewFighter, _reviewDummy);
    }, btnW, 22, '#a855f7', 3);

  // ═════════════════════════════════════════════
  // PILLAR 3: WEAPON & ARSENAL DOSSIER
  // ═════════════════════════════════════════════
  } else if (state.reviewTab === 'weapon') {
    ctx.save();
    ctx.translate(heroX, heroY);
    const wpnScale = state.weaponPreviewScale || 2.4;
    ctx.scale(wpnScale, wpnScale);
    ctx.translate(0, Math.sin(Date.now() / 400) * 6);
    drawWeaponPreview(ctx, def.type, def.color);
    ctx.restore();

    // Zoom Controls Overlay (Top Right)
    const zoomX = stageX + stageW - 32;
    const zoomY = stageY + 36;
    const zoomPct = Math.round(((state.weaponPreviewScale || 2.4) / 2.4) * 100);

    drawButton('🔍+', zoomX, zoomY, () => {
      state.weaponPreviewScale = Math.min(4.8, (state.weaponPreviewScale || 2.4) + 0.4);
    }, 32, 22, null, 2);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 9px "Rajdhani", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${zoomPct}%`, zoomX, zoomY + 20);

    drawButton('🔍-', zoomX, zoomY + 40, () => {
      state.weaponPreviewScale = Math.max(1.0, (state.weaponPreviewScale || 2.4) - 0.4);
    }, 32, 22, null, 2);

    // Multi-Weapon Selectors (Prominent in Weapon Arsenal Tab)
    drawMultiWeaponSwitcher(ctx, def, stageX, stageY, stageW, stageH, 'weapon');
  }

  ctx.restore();

  // ── Tier 3: Technical Dossier Card (Y: 480 to 890) ──
  drawWeaponInfoCard(ctx, def);

  // ── Tier 4: Bottom Navigation Dock (Y: 926) ──
  drawButton('⌂ BACK TO ROSTER', canvas.width / 2, canvas.height - 34, () => {
    state.gameState = 'weapons';
  }, 160, 28, null, 4);
}

// ─────────────────────────────────────────────
// 6. WEAPON GRAPHICS & PREVIEW RENDERERS
// ─────────────────────────────────────────────

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

  // Menuki
  ctx.fillStyle = '#DAA520';
  for (let dx = -13.25; dx <= 6; dx += 3.5) {
    ctx.fillRect(dx, -0.5, 1, 1);
  }

  // 3. Tsuka-ito
  ctx.strokeStyle = '#D11A2A';
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

  // Fuchi
  ctx.fillStyle = '#8B6508';
  ctx.fillRect(8, -2.5, 2, 5);
  ctx.strokeRect(8, -2.5, 2, 5);

  // Left Seppa
  ctx.fillStyle = '#DAA520';
  ctx.fillRect(10, -4, 0.8, 8);

  // 4. Tsuba
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

  // Tsuba Details
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(12.3, -4.5, 1, 1.2);
  ctx.fillRect(12.3, 3.3, 1, 1.2);

  // Right Seppa
  ctx.fillStyle = '#DAA520';
  ctx.fillRect(14.8, -4, 0.8, 8);

  // 5. Habaki
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(15.6, -2, 3.4, 4);
  ctx.strokeRect(15.6, -2, 3.4, 4);

  // 6. Blade
  ctx.beginPath();
  ctx.moveTo(19, -1.8);
  ctx.quadraticCurveTo(49, -4.2, 81, -8.0);
  ctx.quadraticCurveTo(78, -3.5, 75, -2.2);
  ctx.quadraticCurveTo(49, 1.2, 19, 2.2);
  ctx.closePath();
  ctx.fillStyle = '#E5E8E8';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(19, -1.8);
  ctx.quadraticCurveTo(49, -4.0, 75, -6.8);
  ctx.lineTo(75, -4.2);
  ctx.quadraticCurveTo(49, -0.8, 19, 0.2);
  ctx.closePath();
  ctx.fillStyle = '#2F3538';
  ctx.fill();

  // Hamon line
  ctx.beginPath();
  ctx.moveTo(19, 0.2);
  for (let x = 19; x <= 75; x += 3.5) {
    const waveY = 0.2 - 4.4 * ((x - 19) / 56) + Math.sin(x * 0.75) * 0.45;
    ctx.lineTo(x, waveY);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Mune Highlight
  ctx.beginPath();
  ctx.moveTo(19, -1.8);
  ctx.quadraticCurveTo(49, -4.2, 81, -8.0);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Blade outline
  ctx.beginPath();
  ctx.moveTo(19, -1.8);
  ctx.quadraticCurveTo(49, -4.2, 81, -8.0);
  ctx.quadraticCurveTo(78, -3.5, 75, -2.2);
  ctx.quadraticCurveTo(49, 1.2, 19, 2.2);
  ctx.closePath();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.0;
  ctx.stroke();

  // 7. Hands holding the hilt
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly);
  if (!shouldHideHands) {
    const handR = 4.8;
    const skinCol = '#FABC95';
    drawYutaFist(ctx, -8.5, 0, handR, skinCol, null, true);
    drawYutaFist(ctx, 2.5, 0, handR, skinCol, null, false);
  }

  ctx.restore();
}

function drawWeaponPreview(ctx, type, color) {
  const now = Date.now();
  const gunAngle = (state.gameState === 'weaponDetail' && state.weaponPreviewAngle !== undefined) ? state.weaponPreviewAngle : 0;
  const r = 25;

  let offsetX = -40;
  if (type === 'black') offsetX = 0;
  else if (type === 'knight' || type === 'musashi') offsetX = -20; 
  else if (type === 'zeus' || type === 'darkslategray' || type === 'berserker' || type === 'bomber' || type === 'melee') offsetX = -35;
  else if (type === 'cronos') offsetX = -55;
  else if (type === 'ruby') offsetX = -75;
  else if (type === 'toji' || type === 'denji' || type === 'power' || type === 'tanjiro' || type === 'zenitsu' || type === 'inosuke') offsetX = -40;
  else if (type === 'nezuko') offsetX = -35;
  else if (type === 'yuta') offsetX = -40;
  else if (type === 'megumi') offsetX = -45;
  else if (type === 'layla') offsetX = -30;
  else if (type === 'uryu' || type === 'rubbick' || type === 'trickster') offsetX = 0;
  else if (type === 'ichigo') {
    offsetX = (state.selectedIchigoSkin === 'shikai') ? -55 : -55;
  }
  
  ctx.translate(offsetX, 0);

  try {
    switch (type) {
      case 'rifle':
      case 'tactical_commando':
      case 'tactical_guerilla':
      case 'tactical_heavy':
        drawTacticalRifleWeapon(ctx, 0, 0, gunAngle, r, { isPreview: true, themeColor: '#3b82f6' });
        return;

      case 'shotgun':
      case 'tactical_breacher':
        drawTacticalShotgunWeapon(ctx, 0, 0, gunAngle, r, { isPreview: true, themeColor: '#10b981' });
        return;

      case 'pistol':
      case 'tactical_gunslinger':
      case 'tactical_infiltrator':
        drawTacticalPistolWeapon(ctx, 0, 0, gunAngle, r, { isPreview: true, themeColor: '#f59e0b' });
        return;

      case 'sniper':
      case 'tactical_sniper':
      case 'tactical_marksman':
        drawTacticalSniperWeapon(ctx, 0, 0, gunAngle, r, { isPreview: true, themeColor: '#ef4444' });
        return;

      case 'barrett':
      case 'barrett50cal':
      case 'tactical_barrett':
        drawBarrettWeapon(ctx, 0, 0, gunAngle, r, { isPreview: true, themeColor: '#06b6d4' });
        return;

      case 'ichigo': {
        const isShikaiActive = (state.selectedIchigoSkin !== 'bankai');
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
        drawRedSniperGun(ctx, 0, 0, gunAngle, r);
        return;

      case 'aimbot':
        drawBlueAimbotGun(ctx, 0, 0, gunAngle, r);
        return;

      case 'grenadier':
        drawGreenBottleGun(ctx, 0, 0, gunAngle, r);
        return;

      case 'laser':
        drawWhiteRailgun(ctx, 0, 0, gunAngle, r);
        return;

      case 'knight':
        drawGrayShield(ctx, 0, 0, gunAngle, 0, 'none', r);
        drawGraySword(ctx, 0, 0, gunAngle, r);
        return;

      case 'darkslategray':
        drawDarkSlateGrayShuriken(ctx, 0, 0, gunAngle, r);
        return;

      case 'orange':
        drawOrangeFlamethrowerGun(ctx, 0, 0, gunAngle, r);
        return;

      case 'berserker':
        drawBerserkerDualAxes(ctx, 0, 0, gunAngle, r, false, false, 0, 0, 24);
        return;

      case 'cronos':
        drawCronosCrescentBlade(ctx, 0, 0, gunAngle, r, false, 0, 0, 10, 1);
        return;

      case 'yuta':
        drawYutaKatana(ctx, 0, 0, gunAngle);
        return;

      case 'ruby':
        drawRubyScythe(ctx, { r, gunAngle, activePullActive: false, passiveSpinActive: false, scytheSwingActive: false });
        return;

      case 'rubbick':
      case 'trickster': {
        const mockFighter = {
          x: 0,
          y: 0,
          r: r,
          gunAngle: gunAngle,
          staffAngle: gunAngle,
          attackCooldown: 0,
          attackSwingTimer: 0,
          stolenWindUpTimer: 0,
          tkTimer: 0,
          beamCharge: 0,
          beamTimer: 0,
          isPreview: true,
          color: color || '#10b981',
          themeColor: '#7c3aed'
        };
        drawRubbickStaff(ctx, mockFighter);
        return;
      }

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
        ctx.fillStyle = skinColor;
        ctx.fillRect(0, -6, 20, 12);
        ctx.fillStyle = '#3B2A18';
        ctx.fillRect(15, -4, 8, 8);
        ctx.fillStyle = skinAccentColor;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(5 + i * 6, 0, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        return;
      }

      case 'uryu':
        ctx.save();
        ctx.scale(0.72, 0.72);
        drawUryuBow(ctx, 0, 0, r, 0.35, { isAiming: true });
        ctx.restore();
        return;

      case 'gunslinger':
        drawGunSlingerDualRevolver(0, 0, gunAngle, gunAngle + 0.18, r, false, 0);
        return;

      case 'melee':
        drawSpikeWeapon(ctx, 0, 0, gunAngle, r, false, now);
        return;

      case 'black': {
        ctx.save();
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
        ctx.restore();

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
        ctx.restore();

        ctx.restore();
        return;
      }

      case 'Engineer':
        drawEngineer(ctx, { x: 0, y: 0, gunAngle: gunAngle, r: r, lastWeaponUsed: 'shotgun' });
        return;

      case 'zeus':
        drawZeusWeapon(ctx, 0, 0, gunAngle, r, Date.now() / 200);
        return;

      case 'toji': {
        const activeIndex = (state.tojiWeaponIndex || 0);
        if (activeIndex === 0) {
          drawInvertedSpear(ctx, 0, 0, gunAngle, r);
        } else {
          drawSplitSoulKatana(ctx, 0, 0, gunAngle, r);
        }
        return;
      }

      case 'mahoraga':
        drawMahoragaSword(ctx, 0, 0, gunAngle, r);
        return;

      case 'mahito':
        drawMahitoClawWeapon(ctx, 0, 0, gunAngle, r, false);
        return;

      case 'nanami':
        drawNanamiCleaver(ctx, 0, 0, gunAngle, r, false);
        return;

      case 'megumi':
        drawMegumiShadowBlade(ctx, 0, 0, gunAngle - 1.12, r, false, 0);
        return;

      case 'ulquiorra':
        drawUlquiorraMurcielago(ctx, 0, 0, gunAngle, r, false, 0);
        return;

      case 'john_wick':
      case 'johnwick': {
        const activeIndex = (state.johnWickWeaponIndex || 0);
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

      case 'cj': {
        const activeIndex = (state.cjWeaponIndex || 0);
        if (activeIndex === 0) {
          drawCjBrassKnuckles(ctx, 0, 0, gunAngle, r, { standalone: true });
        } else if (activeIndex === 1) {
          drawCjJetpackWeapon(ctx, 0, 0, gunAngle, r);
        } else if (activeIndex === 2) {
          drawCjMicroUzi(ctx, 0, 0, 1.35, 0, 0);
        } else if (activeIndex === 3) {
          drawCjMinigun(ctx, -14, 0, 0, 0, { scale: 1.35 });
        } else {
          drawCjTec9(ctx, 0, 0, 1.35, 0, 0);
        }
        return;
      }

      case 'denji':
        drawDenjiWeaponPreview(ctx, 0, 0, gunAngle, r);
        return;

      case 'power': {
        const isScythe = (state.powerWeaponIndex === 1);
        drawPowerWeaponPreview(ctx, 0, 0, gunAngle, r, { isScythe });
        return;
      }

      case 'tanjiro':
        drawTanjiroNichirinKatana(ctx, 0, 0, gunAngle, r, { isPreview: true });
        return;

      case 'nezuko':
        drawNezukoDemonClaws(ctx, 0, 0, gunAngle, r, { isPreview: true });
        return;

      case 'zenitsu':
        drawZenitsuLightningKatana(ctx, 0, 0, gunAngle, r, { isPreview: true });
        return;

      case 'inosuke':
        drawInosukeDualSerratedKatanas(ctx, 0, 0, gunAngle, r, { isPreview: true });
        return;

      default:
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
if (eventTarget && typeof eventTarget.addEventListener === 'function') {
  eventTarget.addEventListener('wheel', (e) => {
    if (state.gameState === 'weaponDetail') {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.3 : 0.3;
      if (state.reviewTab === 'model') {
        state.modelZoom = Math.min(4.5, Math.max(1.0, (state.modelZoom || 2.2) + delta));
      } else if (state.reviewTab === 'weapon') {
        state.weaponPreviewScale = Math.min(4.8, Math.max(1.0, (state.weaponPreviewScale || 2.4) + delta));
      }
      return;
    }
    if (state.gameState === 'weapons') {
      e.preventDefault();
      const activeDefs = (state.weaponCategoryTab === 'tactical') ? TACTICAL_FIGHTER_DEFS : FIGHTER_DEFS;
      const totalPages = Math.ceil(activeDefs.length / 5);
      if (e.deltaY > 0 && state.weaponPage < totalPages - 1) {
        state.weaponPage++;
      } else if (e.deltaY < 0 && state.weaponPage > 0) {
        state.weaponPage--;
      }
      return;
    }
  }, { passive: false });

  let isDraggingModel = false;
  let lastDragX = 0;

  eventTarget.addEventListener('mousedown', (e) => {
    if (state.gameState !== 'weaponDetail' || state.reviewTab !== 'model') return;
    const rect = eventTarget.getBoundingClientRect();
    const scaleX = state.canvas.width / rect.width;
    const scaleY = state.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    if (mx >= 16 && mx <= state.canvas.width - 16 && my >= 110 && my <= 470) {
      isDraggingModel = true;
      lastDragX = mx;
      state.modelAutoSpin = false;
    }
  });

  eventTarget.addEventListener('mousemove', (e) => {
    if (!isDraggingModel || state.gameState !== 'weaponDetail' || state.reviewTab !== 'model') return;
    const rect = eventTarget.getBoundingClientRect();
    const scaleX = state.canvas.width / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    const dx = mx - lastDragX;
    lastDragX = mx;
    state.modelAngle = (state.modelAngle || 0) + dx * 0.02;
  });

  window.addEventListener('mouseup', () => {
    isDraggingModel = false;
  });
}
