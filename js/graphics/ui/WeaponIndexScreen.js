import { goToTitle } from '../../core/gameFlow.js';
import { state } from '../../core/state.js';
import { updatePreviewBalls } from './FighterIndexScreen.js';
import { FIGHTER_DEFS, CONFIG } from '../../core/config.js';
import { Fighter } from '../../entities/fighter.js';
import { FIGHTER_CLASS_MAP } from '../../entities/factories/fighterFactory.js';
import { clearHealthHud } from '../hudManager.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar, drawChamferedRect } from './uiFramework.js';
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
import { spawnHollowMaskShatter, updateDeathEffects, drawDeathEffects } from '../particles/deathShatterEffect.js';
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

  // Sleek Dark Gunmetal Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, '#07080c');
  bgGrad.addColorStop(0.5, '#10131c');
  bgGrad.addColorStop(1, '#07080c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updatePreviewBalls();

  // ── Header Section ──
  ctx.fillStyle = '#64748b';
  ctx.font = '900 10px "Rajdhani", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('CIRCLE BATTLE // ARSENAL DATABASE // SYS.v2.5', canvas.width / 2, 48);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px "Outfit", "Rajdhani", sans-serif';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
  ctx.shadowBlur = 8;
  ctx.fillText('[ WEAPON ARSENAL ]', canvas.width / 2, 70);
  ctx.restore();

  // ── Category Switcher Tabs ──
  if (!state.weaponCategoryTab) {
    state.weaponCategoryTab = (state.gameCategory === 'tactical') ? 'tactical' : 'foc';
  }

  const tabY = 94;
  const tabW = 160;
  const tabH = 26;
  const tabGap = 12;
  const totalTabsW = tabW * 2 + tabGap;
  const tabStartX = (canvas.width - totalTabsW) / 2;

  // Tab 1: FOC Fantasy / Anime Weapons
  const isFoc = state.weaponCategoryTab !== 'tactical';
  drawButton(
    isFoc ? '⚔️ [ FOC WEAPONS ]' : '⚔️ FOC WEAPONS',
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
    isTac ? '🎯 [ TACTICAL FIREARMS ]' : '🎯 TACTICAL FIREARMS',
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
    isTac ? '#3b82f6' : null,
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

    // Text Layout
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 16px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(def.name.toUpperCase(), cardX + 20, cardY + 14);

    // Weapon Designation & Category
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 10.5px "Rajdhani", sans-serif';
    ctx.fillText(`WEAPON // ${weaponInfo.name}`, cardX + 20, cardY + 34);

    ctx.fillStyle = '#64748b';
    ctx.font = '900 8.5px "Rajdhani", sans-serif';
    ctx.fillText(`[ ${weaponInfo.category} ]`, cardX + 20, cardY + 49);

    // Description snippet
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Rajdhani", Arial, sans-serif';
    wrapText(ctx, weaponInfo.desc, cardX + 20, cardY + 65, cardW - 145, 12.5);

    // Live Weapon Preview Stage Pedestal
    const previewSize = 88;
    const previewX = cardX + cardW - previewSize / 2 - 16;
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
    ctx.scale(0.72, 0.72);
    // Subtle floating animation per card
    ctx.translate(0, Math.sin(Date.now() / 300 + idx) * 3);
    drawWeaponPreview(ctx, def.type, def.color);
    ctx.restore();

    // Make card clickable
    _registerButton(cardX, cardY, cardW, cardH, () => {
      state.selectedWeapon = def;
      state.showWeaponModel = false;
      state.showSummonModel = false;
      state.slashEditMode = false;
      state.gameState = 'weaponDetail';
    });
  });

  // ── Pagination Controls Bar ──
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

function drawWeaponInfoCard(ctx, def) {
  const { canvas } = state;
  const containerW = canvas.width - 32; // 508px
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
      nameText = 'Murciélago (Ulquiorra Cifer Katana)';
      descText = 'Standard katana form of the Cuatro Espada with green tsuka-ito wrap and 4-corner flared Espada tsuba. Delivers swift Reishi-infused katana slashes, Bala pulses, high-speed Sonído dashes, and Hierro armor.';
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
  ctx.fillText(nameText.toUpperCase(), containerX + 18, panelY + 16);

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
  ctx.fillText('TECHNICAL SPECIFICATIONS & FIELD MECHANICS //', containerX + 18, statY + 14);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10.5px "Rajdhani", Arial, sans-serif';
  wrapText(ctx, descText || '', containerX + 18, statY + 32, containerW - 36, 14.5);
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
  drawButton('← ARSENAL', 58, navY, () => {
    state.clawEditMode = false;
    state.gameState = 'weapons';
  }, 85, 24, null, 4);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
  ctx.shadowBlur = 8;
  ctx.fillText('[ WEAPON DOSSIER ]', canvas.width / 2, navY);
  ctx.restore();

  const activeList = TACTICAL_FIGHTER_DEFS.some(f => f.type === def.type) ? TACTICAL_FIGHTER_DEFS : FIGHTER_DEFS;
  const currentIdx = activeList.findIndex(f => f.type === def.type);
  if (currentIdx > 0) {
    drawButton('◄ PREV', canvas.width - 95, navY, () => {
      state.selectedWeapon = activeList[currentIdx - 1];
    }, 55, 24, null, 3);
  }
  if (currentIdx < activeList.length - 1) {
    drawButton('NEXT ►', canvas.width - 34, navY, () => {
      state.selectedWeapon = activeList[currentIdx + 1];
    }, 55, 24, null, 3);
  }

  // ── Tier 1b: Mode Action Filter Chips Bar (Y: 88) ──
  const actionY = 88;
  const buttonsToDraw = [];

  const modelToggleText = state.showWeaponModel ? 'WEAPON ONLY' : 'FIGHTER MODEL';
  buttonsToDraw.push({
    text: modelToggleText,
    width: 110,
    action: () => {
      state.showWeaponModel = !state.showWeaponModel;
      if (state.showWeaponModel) {
        state.showSummonModel = false;
      } else {
        state.slashEditMode = false;
      }
    }
  });

  const skinOnlyToggleText = state.showSkinOnly ? 'SKIN: ON' : 'SKIN: OFF';
  buttonsToDraw.push({
    text: skinOnlyToggleText,
    width: 85,
    action: () => {
      state.showSkinOnly = !state.showSkinOnly;
      if (state.showSkinOnly) {
        state.showWeaponModel = true;
        state.showSummonModel = false;
      }
    }
  });

  if (def.type === 'ichigo') {
    const maskToggleText = state.showHollowMask ? 'MASK: ON' : 'MASK: OFF';
    buttonsToDraw.push({
      text: maskToggleText,
      width: 90,
      action: () => {
        state.showHollowMask = !state.showHollowMask;
        if (state.previewFighter) {
          state.previewFighter.hollowMaskActive = state.showHollowMask;
          state.previewFighter.demoShatterTimer = 0;
          if (state.showHollowMask) {
            state.previewFighter.hollowMaskFormationTimer = 54;
            state.previewFighter.hollowMaskFormationMax = 54;
            state.previewFighter.hollowMaskTimer = 600;
            audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.9);
          } else {
            state.previewFighter.hollowMaskFormationTimer = 0;
          }
        }
      }
    });

    const isForming = state.previewFighter && state.previewFighter.hollowMaskFormationTimer > 0;
    buttonsToDraw.push({
      text: isForming ? 'FORMING...' : 'FORM MASK',
      width: 100,
      action: () => {
        state.showHollowMask = true;
        if (state.previewFighter) {
          state.previewFighter.hollowMaskActive = true;
          state.previewFighter.demoShatterTimer = 0;
          state.previewFighter.hollowMaskFormationTimer = 54;
          state.previewFighter.hollowMaskFormationMax = 54;
          state.previewFighter.hollowMaskTimer = 600;
          audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.9);
        }
      }
    });

    const isShattering = state.previewFighter && state.previewFighter.demoShatterTimer > 0;
    buttonsToDraw.push({
      text: isShattering ? 'CRACKING...' : 'SHATTER MASK',
      width: 110,
      action: () => {
        state.showHollowMask = true;
        if (state.previewFighter) {
          state.previewFighter.hollowMaskActive = true;
          state.previewFighter.hollowMaskFormationTimer = 0;
          state.previewFighter.demoShatterTimer = 75;
        }
      }
    });
  }

  if (def.type === 'ulquiorra' || def.type === 'ulquiorra_cifer') {
    const wingsToggleText = state.showUlquiorraWings ? 'WINGS: ON' : 'WINGS: OFF';
    buttonsToDraw.push({
      text: wingsToggleText,
      width: 95,
      action: () => {
        state.showUlquiorraWings = !state.showUlquiorraWings;
        if (state.showUlquiorraWings) {
          state.showWeaponModel = true;
          state.showSummonModel = false;
        }
        if (state.previewFighter) {
          state.previewFighter.stage1Active = state.showUlquiorraWings;
          state.previewFighter.wingsActive = state.showUlquiorraWings;
          state.previewFighter.isMurcielagoActive = state.showUlquiorraWings;
        }
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85);
        }
      }
    });

    const segundaToggleText = state.showUlquiorraSegunda ? 'SEGUNDA: ON' : 'SEGUNDA: OFF';
    buttonsToDraw.push({
      text: segundaToggleText,
      width: 105,
      action: () => {
        state.showUlquiorraSegunda = !state.showUlquiorraSegunda;
        if (state.showUlquiorraSegunda) {
          state.showUlquiorraWings = true;
          state.showWeaponModel = true;
          state.showSummonModel = false;
        }
        if (state.previewFighter) {
          state.previewFighter.stage1Active = state.showUlquiorraWings;
          state.previewFighter.wingsActive = state.showUlquiorraWings;
          state.previewFighter.segundaEtapaActive = state.showUlquiorraSegunda;
          state.previewFighter.isSegundaEtapa = state.showUlquiorraSegunda;
        }
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.9);
        }
      }
    });
  }

  const isAttacking = isFighterDemoAttacking(state.previewFighter);
  const demoBtnText = isAttacking ? 'ATTACKING...' : 'DEMO ATTACK';
  buttonsToDraw.push({
    text: demoBtnText,
    width: 110,
    action: () => { 
      state.showWeaponModel = true;
      state.showSummonModel = false;
      triggerWeaponDemoAttack(def); 
    }
  });

  if (hasSummon) {
    const summonLabel = (def.type === 'yuta') ? 'RIKA' : (def.type === 'Engineer' ? 'SENTRY' : 'SUMMON');
    const summonToggleText = state.showSummonModel ? `${summonLabel}: ON` : `${summonLabel}: OFF`;
    buttonsToDraw.push({
      text: summonToggleText,
      width: 95,
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

  const totalBtnWidth = buttonsToDraw.reduce((acc, b) => acc + b.width, 0);
  const gap = 8;
  const totalRowW = totalBtnWidth + (buttonsToDraw.length - 1) * gap;
  let currentBtnX = (canvas.width - totalRowW) / 2;

  buttonsToDraw.forEach(btn => {
    drawButton(btn.text, currentBtnX + btn.width / 2, actionY, btn.action, btn.width, 24, null, 4);
    currentBtnX += btn.width + gap;
  });

  // ── Tier 2: Hero Weapon Showcase Stage (Y: 110 to 470, H: 360px) ──
  const stageX = 16;
  const stageY = 110;
  const stageW = canvas.width - 32; // 508px
  const stageH = 360;
  const heroX = canvas.width / 2;
  const heroY = stageY + 160;

  drawPanel(stageX, stageY, stageW, stageH, 0.94, 8);

  // Background inside Stage (Plain White Review Canvas)
  ctx.save();
  ctx.beginPath();
  drawChamferedRect(ctx, stageX + 1, stageY + 1, stageW - 2, stageH - 2, 7);
  ctx.clip();

  // Plain White Background Fill
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(stageX, stageY, stageW, stageH);

  // Animated Hero Weapon Display
  const currentScale = state.weaponPreviewScale || 2.4;
  ctx.save();
  ctx.translate(heroX, heroY);
  ctx.scale(currentScale, currentScale);
  ctx.translate(0, state.clawEditMode ? 0 : Math.sin(Date.now() / 400) * 6);
  
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
        previewFighter.rika.active = true;
        previewFighter.rika.x = 0;
        previewFighter.rika.y = 0;
        previewFighter.cursedEnergyAlpha = 1.0;
        
        if ((state.previewRightArmTimer || 0) > 0) {
          state.previewRightArmTimer--;
          if (state.previewRightArmTimer === 30 && (state.previewLeftArmTimer || 0) <= 0) {
            state.previewLeftArmTimer = 60;
          }
        }
        if ((state.previewLeftArmTimer || 0) > 0) {
          state.previewLeftArmTimer--;
        }
        previewFighter.rika.attackTimer  = state.previewRightArmTimer || 0;
        previewFighter.rika.leftArmTimer = state.previewLeftArmTimer  || 0;

        if (state.previewShowCursedEnergy) {
          previewFighter._drawRikaCursedEnergyAura(ctx);
        }
        previewFighter._drawRika(ctx, { x: 100, y: 0 });
      } else {
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

    if (def.type === 'ichigo') {
      previewFighter.skin = state.selectedIchigoSkin || 'shikai';
      if (previewFighter.demoShatterTimer !== undefined && previewFighter.demoShatterTimer > 0) {
        previewFighter.hollowMaskActive = true;
        previewFighter.hollowMaskTimer = Math.round((previewFighter.demoShatterTimer / 75) * 160);
        previewFighter.demoShatterTimer--;
        if (previewFighter.demoShatterTimer <= 0) {
          previewFighter.hollowMaskActive = false;
          state.showHollowMask = false;
          spawnHollowMaskShatter(previewFighter);
        }
      } else {
        previewFighter.hollowMaskActive = Boolean(state.showHollowMask);
        if (previewFighter.hollowMaskFormationTimer > 0) {
          previewFighter.hollowMaskFormationTimer--;
        }
        if (previewFighter.hollowMaskActive && (previewFighter.hollowMaskTimer === undefined || previewFighter.hollowMaskTimer <= 0)) {
          previewFighter.hollowMaskTimer = 600;
        }
      }
    }

    if (def.type === 'cj') {
      const cjIdx = state.cjWeaponIndex || 0;
      previewFighter.z = (cjIdx === 1 || cjIdx === 2) ? 24 : 0;
      previewFighter.isJetpackActive = (cjIdx === 1 || cjIdx === 2);
      previewFighter.isBaguvixActive = (cjIdx === 3);
      previewFighter.isGodModeActive = (cjIdx === 3);
      previewFighter.isTec9Active = (cjIdx === 4);
      previewFighter.previewWeaponIndex = cjIdx;
    }

    if (def.type === 'ulquiorra' || def.type === 'ulquiorra_cifer') {
      previewFighter.stage1Active = Boolean(state.showUlquiorraWings);
      previewFighter.wingsActive = Boolean(state.showUlquiorraWings);
      previewFighter.isMurcielagoActive = Boolean(state.showUlquiorraWings);
      previewFighter.segundaEtapaActive = Boolean(state.showUlquiorraSegunda);
      previewFighter.isSegundaEtapa = Boolean(state.showUlquiorraSegunda);
    }

    if (previewFighter.spearSwingTimer > 0) previewFighter.spearSwingTimer--;
    if (previewFighter.katanaSlashTimer > 0) previewFighter.katanaSlashTimer--;
    if (previewFighter.punchAnimTimer > 0) previewFighter.punchAnimTimer--;
    if (previewFighter.slashSwingTimer > 0) previewFighter.slashSwingTimer--;
    if (previewFighter.recoilTimer > 0) previewFighter.recoilTimer--;
    if (previewFighter.slashGlowTimer > 0) previewFighter.slashGlowTimer--;
    if (previewFighter.meleeCooldown > 0) previewFighter.meleeCooldown--;
    if (previewFighter.wheelGlowTimer > 0) previewFighter.wheelGlowTimer--;
    if (previewFighter.tec9Recoil > 0) previewFighter.tec9Recoil = Math.max(0, previewFighter.tec9Recoil - 0.6);
    if (previewFighter.tec9Flash > 0) previewFighter.tec9Flash--;
    if (previewFighter.uziRecoilFront > 0) previewFighter.uziRecoilFront = Math.max(0, previewFighter.uziRecoilFront - 0.5);
    if (previewFighter.uziRecoilBack > 0) previewFighter.uziRecoilBack = Math.max(0, previewFighter.uziRecoilBack - 0.5);
    if (previewFighter.uziFlashTimerFront > 0) previewFighter.uziFlashTimerFront--;
    if (previewFighter.uziFlashTimerBack > 0) previewFighter.uziFlashTimerBack--;
    if (previewFighter.minigunRecoil > 0) previewFighter.minigunRecoil = Math.max(0, previewFighter.minigunRecoil - 0.8);
    if (previewFighter.minigunFlashTimer > 0) {
      previewFighter.minigunFlashTimer--;
      previewFighter.minigunSpinAngle = (previewFighter.minigunSpinAngle || 0) + 0.45;
    }
    if (previewFighter.minigunHeat > 0) previewFighter.minigunHeat = Math.max(0, previewFighter.minigunHeat - 0.02);

    // Tactical Force Firearm Preview Timers
    if (previewFighter.muzzleFlashTimer > 0) previewFighter.muzzleFlashTimer--;
    if (previewFighter.gunRecoil > 0) previewFighter.gunRecoil = Math.max(0, previewFighter.gunRecoil - 0.12);
    if (previewFighter.pumpTimer > 0) {
      previewFighter.pumpTimer--;
      if (previewFighter.pumpTimer === 11 && typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        const cfg = CONFIG.spas12 || CONFIG.shotgun || {};
        audioSystem.playSFX(cfg.sounds?.pump || 'Assets/Sound Effects/Skills/johnwick-shotgun-crack.mp3', cfg.soundVolumes?.pump ?? 1.0, 1.0);
      }
    }
    if (previewFighter.burstShotsRemaining > 0) {
      previewFighter.burstTimer--;
      if (previewFighter.burstTimer <= 0) {
        previewFighter.burstShotsRemaining--;
        previewFighter.burstTimer = 4;
        previewFighter.muzzleFlashTimer = 3;
        previewFighter.gunRecoil = 0.9;
        const cfg = CONFIG.m4a1 || CONFIG.rifle || {};
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX(cfg.sounds?.fire || 'Assets/Sound Effects/Skills/johnwick-m4-shot.mp3', cfg.soundVolumes?.fire ?? 1.0, 1.0);
        }
      }
    }

    if (previewFighter.isSlashing && previewFighter.slashSwingTimer > 0) {
      previewFighter.slashSwingTimer--;
      previewFighter.slashProgress = 1 - (previewFighter.slashSwingTimer / (previewFighter.slashSwingMaxTimer || 16));
      if (previewFighter.slashSwingTimer <= 0) {
        previewFighter.isSlashing = false;
        previewFighter.slashProgress = 0;
      }
    }

    try {
      const fakeTarget = { x: 80, y: 0, r: 25, hp: 100, maxHp: 100, vx: 0, vy: 0, applyKnockback: () => {}, applySlow: () => {}, applyTimeStop: () => {}, takeDamage: () => {} };
      previewFighter.draw(ctx, fakeTarget);
      updateDeathEffects();
      drawDeathEffects();
    } catch (e) {
      console.error('Preview draw error:', e);
    }
  } else {
    drawWeaponPreview(ctx, def.type, def.color);
  }
  ctx.restore(); // Restore Weapon Scale

  ctx.restore(); // Restore Stage Clip

  // Zoom Steppers overlay inside stage (Top Right)
  const zoomX = stageX + stageW - 32;
  const zoomY = stageY + 36;
  const zoomPct = Math.round(((state.weaponPreviewScale || 2.4) / 2.4) * 100);

  drawButton('🔍+', zoomX, zoomY, () => {
    state.weaponPreviewScale = Math.min(4.8, (state.weaponPreviewScale || 2.4) + 0.4);
  }, 32, 22, null, 2);

  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 9.5px "Rajdhani", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${zoomPct}%`, zoomX, zoomY + 20);

  drawButton('🔍-', zoomX, zoomY + 40, () => {
    state.weaponPreviewScale = Math.max(1.0, (state.weaponPreviewScale || 2.4) - 0.4);
  }, 32, 22, null, 2);

  // Multi-Weapon Sub-Selectors (Toji, John Wick, Ichigo) inside bottom of stage
  const pagY = stageY + stageH - 24;

  if (def.type === 'toji') {
    state.tojiWeaponIndex = state.tojiWeaponIndex || 0;
    const currentWeaponLabel = (state.tojiWeaponIndex === 0) 
      ? '1/2: INVERTED SPEAR OF HEAVEN' 
      : '2/2: SPLIT SOUL KATANA';

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 11px "Rajdhani", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentWeaponLabel, canvas.width / 2, pagY);

    drawButton('◄', canvas.width / 2 - 135, pagY, () => {
      state.tojiWeaponIndex = (state.tojiWeaponIndex === 0) ? 1 : 0;
      state.previewFighter = null;
    }, 30, 22, null, 3);

    drawButton('►', canvas.width / 2 + 135, pagY, () => {
      state.tojiWeaponIndex = (state.tojiWeaponIndex === 0) ? 1 : 0;
      state.previewFighter = null;
    }, 30, 22, null, 3);
  } else if (def.type === 'john_wick' || def.type === 'johnwick') {
    state.johnWickWeaponIndex = state.johnWickWeaponIndex || 0;
    const labels = ['1/4: PIT VIPER 9MM', '2/4: BENELLI M4 SHOTGUN', '3/4: M4A1 CARBINE', '4/4: THE NO. 2 PENCIL'];
    const currentWeaponLabel = labels[state.johnWickWeaponIndex] || labels[0];

    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 11px "Rajdhani", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentWeaponLabel, canvas.width / 2, pagY);

    drawButton('◄', canvas.width / 2 - 135, pagY, () => {
      state.johnWickWeaponIndex = (state.johnWickWeaponIndex + 3) % 4;
      if (state.previewFighter) {
        if (state.johnWickWeaponIndex === 0) { state.previewFighter.currentEquippedWeapon = 'pistol'; state.previewFighter.isPencilEquipped = false; }
        else if (state.johnWickWeaponIndex === 1) { state.previewFighter.currentEquippedWeapon = 'shotgun'; state.previewFighter.isPencilEquipped = false; }
        else if (state.johnWickWeaponIndex === 2) { state.previewFighter.currentEquippedWeapon = 'rifle'; state.previewFighter.isPencilEquipped = false; }
        else { state.previewFighter.currentEquippedWeapon = 'pistol'; state.previewFighter.isPencilEquipped = true; }
      }
      audioSystem.playSFX('Assets/Sound Effects/Skills/johnwick-gunswitch.mp3', 0.9);
    }, 30, 22, null, 3);

    drawButton('►', canvas.width / 2 + 135, pagY, () => {
      state.johnWickWeaponIndex = (state.johnWickWeaponIndex + 1) % 4;
      if (state.previewFighter) {
        if (state.johnWickWeaponIndex === 0) { state.previewFighter.currentEquippedWeapon = 'pistol'; state.previewFighter.isPencilEquipped = false; }
        else if (state.johnWickWeaponIndex === 1) { state.previewFighter.currentEquippedWeapon = 'shotgun'; state.previewFighter.isPencilEquipped = false; }
        else if (state.johnWickWeaponIndex === 2) { state.previewFighter.currentEquippedWeapon = 'rifle'; state.previewFighter.isPencilEquipped = false; }
        else { state.previewFighter.currentEquippedWeapon = 'pistol'; state.previewFighter.isPencilEquipped = true; }
      }
      audioSystem.playSFX('Assets/Sound Effects/Skills/johnwick-gunswitch.mp3', 0.9);
    }, 30, 22, null, 3);
  } else if (def.type === 'ichigo') {
    const maskActive = Boolean(state.showHollowMask);
    const isShattering = state.previewFighter && state.previewFighter.demoShatterTimer > 0;
    const shikaiBtnX  = canvas.width / 2 - 145;
    const bankaiBtnX  = canvas.width / 2 - 55;
    const maskBtnX    = canvas.width / 2 + 45;
    const shatterBtnX = canvas.width / 2 + 150;

    drawButton('SHIKAI', shikaiBtnX, pagY, () => {
      state.selectedIchigoSkin = 'shikai';
      if (state.previewFighter) state.previewFighter.skin = 'shikai';
    }, 70, 22, null, 3);

    drawButton('BANKAI', bankaiBtnX, pagY, () => {
      state.selectedIchigoSkin = 'bankai';
      if (state.previewFighter) state.previewFighter.skin = 'bankai';
    }, 70, 22, null, 3);

    const maskLabel = maskActive ? 'MASK: ON' : 'MASK: OFF';
    drawButton(maskLabel, maskBtnX, pagY, () => {
      state.showHollowMask = !state.showHollowMask;
      if (state.previewFighter) {
        state.previewFighter.hollowMaskActive = state.showHollowMask;
        state.previewFighter.demoShatterTimer = 0;
        if (state.showHollowMask) {
          state.previewFighter.hollowMaskFormationTimer = 54;
          state.previewFighter.hollowMaskFormationMax = 54;
          state.previewFighter.hollowMaskTimer = 600;
          audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.9);
        } else {
          state.previewFighter.hollowMaskFormationTimer = 0;
        }
      }
    }, 85, 22, null, 3);

    const shatterLabel = isShattering ? 'CRACKING...' : 'SHATTER';
    drawButton(shatterLabel, shatterBtnX, pagY, () => {
      state.showHollowMask = true;
      if (state.previewFighter) {
        state.previewFighter.hollowMaskActive = true;
        state.previewFighter.demoShatterTimer = 75;
      }
    }, 85, 22, null, 3);
  } else if (def.type === 'cj') {
    state.cjWeaponIndex = state.cjWeaponIndex || 0;
    const labels = [
      '1/5: BRASS KNUCKLES',
      '2/5: DARPA JETPACK',
      '3/5: MICRO SMG (MICRO-UZI)',
      '4/5: M134 MINIGUN',
      '5/5: INTRATEC TEC-9'
    ];
    const currentWeaponLabel = labels[state.cjWeaponIndex] || labels[0];

    ctx.fillStyle = '#16a34a';
    ctx.font = '900 11px "Rajdhani", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(currentWeaponLabel, canvas.width / 2, pagY);

    drawButton('◄', canvas.width / 2 - 135, pagY, () => {
      state.cjWeaponIndex = (state.cjWeaponIndex + 4) % 5;
      if (state.previewFighter) {
        const idx = state.cjWeaponIndex;
        state.previewFighter.z = (idx === 1 || idx === 2) ? 24 : 0;
        state.previewFighter.isJetpackActive = (idx === 1 || idx === 2);
        state.previewFighter.isBaguvixActive = (idx === 3);
        state.previewFighter.isGodModeActive = (idx === 3);
        state.previewFighter.previewWeaponIndex = idx;
      }
      audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85);
    }, 30, 22, null, 3);

    drawButton('►', canvas.width / 2 + 135, pagY, () => {
      state.cjWeaponIndex = (state.cjWeaponIndex + 1) % 5;
      if (state.previewFighter) {
        const idx = state.cjWeaponIndex;
        state.previewFighter.z = (idx === 1 || idx === 2) ? 24 : 0;
        state.previewFighter.isJetpackActive = (idx === 1 || idx === 2);
        state.previewFighter.isBaguvixActive = (idx === 3);
        state.previewFighter.isGodModeActive = (idx === 3);
        state.previewFighter.previewWeaponIndex = idx;
      }
      audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85);
    }, 30, 22, null, 3);
  } else if (def.type === 'ulquiorra' || def.type === 'ulquiorra_cifer') {
    const isBase = !state.showUlquiorraWings && !state.showUlquiorraSegunda;
    const isStage1 = state.showUlquiorraWings && !state.showUlquiorraSegunda;
    const isSegunda = Boolean(state.showUlquiorraSegunda);

    const baseBtnX    = canvas.width / 2 - 120;
    const wingsBtnX   = canvas.width / 2;
    const segundaBtnX = canvas.width / 2 + 125;

    drawButton(isBase ? '[ BASE FORM ]' : 'BASE FORM', baseBtnX, pagY, () => {
      state.showUlquiorraWings = false;
      state.showUlquiorraSegunda = false;
      if (state.previewFighter) {
        state.previewFighter.stage1Active = false;
        state.previewFighter.wingsActive = false;
        state.previewFighter.segundaEtapaActive = false;
        state.previewFighter.isSegundaEtapa = false;
      }
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85);
      }
    }, 100, 22, isBase ? '#00FF88' : null, 3);

    drawButton(isStage1 ? '[ STAGE 1 WINGS ]' : 'STAGE 1 WINGS', wingsBtnX, pagY, () => {
      state.showUlquiorraWings = true;
      state.showUlquiorraSegunda = false;
      state.showWeaponModel = true;
      if (state.previewFighter) {
        state.previewFighter.stage1Active = true;
        state.previewFighter.wingsActive = true;
        state.previewFighter.segundaEtapaActive = false;
        state.previewFighter.isSegundaEtapa = false;
      }
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('Assets/Sound Effects/Skills/dash1.mp3', 0.85);
      }
    }, 115, 22, isStage1 ? '#00FF88' : null, 3);

    drawButton(isSegunda ? '[ SEGUNDA ETAPA ]' : 'SEGUNDA ETAPA', segundaBtnX, pagY, () => {
      state.showUlquiorraWings = true;
      state.showUlquiorraSegunda = true;
      state.showWeaponModel = true;
      if (state.previewFighter) {
        state.previewFighter.stage1Active = true;
        state.previewFighter.wingsActive = true;
        state.previewFighter.segundaEtapaActive = true;
        state.previewFighter.isSegundaEtapa = true;
      }
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('Assets/Sound Effects/Skills/fuga.mp3', 0.9);
      }
    }, 115, 22, isSegunda ? '#00FF88' : null, 3);
  }

  // ── Tier 3: Technical Dossier Card (Y: 480 to 890) ──
  drawWeaponInfoCard(ctx, def);

  // ── Tier 4: Bottom Navigation Dock (Y: 926) ──
  drawButton('⌂ BACK TO ARSENAL', canvas.width / 2, canvas.height - 34, () => {
    state.clawEditMode = false;
    state.gameState = 'weapons';
  }, 160, 28, null, 4);
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

  // 7. Hands holding the hilt (drawn over the hilt wrapper and aura)
  const shouldHideHands = (typeof state !== 'undefined' && state.showSkinOnly);
  if (!shouldHideHands) {
    const handR = 4.8;
    const skinCol = '#FABC95';
    // Rear / Back Hand (Left Hand near pommel at x = -8.5 with signature silver engagement ring)
    drawYutaFist(ctx, -8.5, 0, handR, skinCol, null, true);
    // Lead / Front Hand (Right Hand near tsuba guard at x = 2.5)
    drawYutaFist(ctx, 2.5, 0, handR, skinCol, null, false);
  }

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
  else if (type === 'megumi') offsetX = -45; // Shadow Blade
  else if (type === 'layla') offsetX = -30; // Steampunk Energy Cannon
  else if (type === 'uryu') offsetX = 0; // TYBW Spirit Bow centered
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


      case 'uryu':
        ctx.save();
        ctx.scale(0.72, 0.72);
        drawUryuBow(ctx, 0, 0, r, 0.35, { isAiming: true });
        ctx.restore();
        return;

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

      case 'yuta':
        // Yuta's Lore-Accurate Cursed Katana
        drawYutaKatana(ctx, 0, 0, gunAngle);
        return;

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

      case 'megumi':
        // Megumi's Shadow Blade (Second Cursed Sword) - Diagonal Upright Guard Stance
        drawMegumiShadowBlade(ctx, 0, 0, gunAngle - 1.12, r, false, 0);
        return;

      case 'ulquiorra':
        // Ulquiorra's Zanpakuto: Murcielago
        drawUlquiorraMurcielago(ctx, 0, 0, gunAngle, r, false, 0);
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

      case 'cj': {
        const isStudio = (state.gameState === 'weaponStudio');
        const isDetail = (state.gameState === 'weaponDetail');
        const activeIndex = isStudio 
          ? (state.studioCjWeaponIndex || 0) 
          : (isDetail ? (state.cjWeaponIndex || 0) : 0);

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
if (eventTarget && typeof eventTarget.addEventListener === 'function') {
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
}

// Interactive Claw Editor Drag & Resize Logic
let isDraggingClaw = false;
let activeDragFinger = -1;
let activeDragType = null;

if (typeof window !== 'undefined') {
  if (eventTarget && typeof eventTarget.addEventListener === 'function') {
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

    eventTarget.addEventListener('mousemove', (e) => {
      if (!isDraggingClaw || activeDragFinger < 0 || !state.mahitoClawCustomBlades) return;

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

      const b = state.mahitoClawCustomBlades[activeDragFinger];
      if (!b) return;

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
  }

  window.addEventListener('mouseup', () => {
    isDraggingClaw = false;
    activeDragFinger = -1;
    activeDragType = null;
  });
}
