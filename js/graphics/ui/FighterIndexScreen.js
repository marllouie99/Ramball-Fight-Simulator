import { audioSystem } from '../../systems/audioSystem.js';
import { unlockAudio } from '../../systems/soundSystem.js';
import { goToTitle } from '../../core/gameFlow.js';
import { state } from '../../core/state.js';
import { CONFIG, FIGHTER_DEFS, getActiveFighterDefs } from '../../core/config.js';
import { clearHealthHud } from '../hudManager.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar, drawChamferedRect } from './uiFramework.js';
import { getFighterPreview } from './FighterPreviewCache.js';
import { previewProjectileSystem, updateIndexDetailDemo, resetIndexDetailState } from '../preview.js';
import { drawLaylaBomb, drawLaylaCosmicBlast, drawLaylaUltimateBullet, drawLaylaBasicBullet } from '../renderers/projectileRenderer.js';

let indexDetailAngle = 0;
let indexDetailAnimFrame = 0;

function updatePreviewBalls() {
  const { ctx, canvas } = state;
  if (state.previewBalls.length === 0) {
    for (let i = 0; i < 4; i++) {
      state.previewBalls.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        r: 20 + Math.random() * 25,
        color: Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.04)' : 'rgba(160, 160, 175, 0.03)',
      });
    }
  }

  state.previewBalls.forEach(b => {
    b.x += b.vx;
    b.y += b.vy;
    if (b.x - b.r < 0 || b.x + b.r > canvas.width) b.vx *= -1;
    if (b.y - b.r < 0 || b.y + b.r > canvas.height) b.vy *= -1;

    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = b.color;
    ctx.fill();
  });
}

// ─────────────────────────────────────────────
// SCREENS
// ─────────────────────────────────────────────

function drawIndexScreen() {
  const { ctx, canvas } = state;
  _clearButtons();
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Sleek Dark Gunmetal Background Gradient
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#07080c');
  gradient.addColorStop(0.5, '#10131c');
  gradient.addColorStop(1, '#07080c');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  updatePreviewBalls();

  const isTactical = state.gameCategory === 'tactical';
  const currentDefs = getActiveFighterDefs();

  // ── Header Section ──
  ctx.fillStyle = isTactical ? '#00e5ff' : '#64748b';
  ctx.font = '900 10px "Rajdhani", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(isTactical ? 'TACTICAL SHOOTER // OPERATIVE DOSSIER // SYS.v2.5' : 'CIRCLE BATTLE // FIGHTER DOSSIER // SYS.v2.5', canvas.width / 2, 56);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px "Outfit", "Rajdhani", sans-serif';
  ctx.shadowColor = isTactical ? 'rgba(0, 229, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)';
  ctx.shadowBlur = 8;
  ctx.fillText(isTactical ? '[ SHOOTER ROSTER ]' : '[ FIGHTER DATABASE ]', canvas.width / 2, 78);
  ctx.restore();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10.5px "Rajdhani", sans-serif';
  ctx.fillText(isTactical ? 'Inspect firearm combatants, ballistics data, and tactical abilities.' : 'Inspect combatant classifications, abilities, and core telemetry.', canvas.width / 2, 94);

  // ── Category Filter Tabs ──
  const rawCategories = Array.from(new Set(currentDefs.map(d => d.category).filter(Boolean)));
  const categories = ['All', ...rawCategories];
  const catXStart = 20;
  let currentCX = catXStart;
  let currentCY = 106;
  
  categories.forEach(cat => {
    ctx.font = 'bold 10px "Rajdhani", sans-serif';
    const textW = ctx.measureText(cat.toUpperCase()).width;
    const btnW = textW + 18;
    const btnH = 24;
    
    if (currentCX + btnW > canvas.width - 20) {
      currentCX = catXStart;
      currentCY += btnH + 6;
    }
    
    const isSelected = (state.indexCategory || 'All') === cat;
    
    ctx.save();
    if (isSelected) {
      ctx.fillStyle = isTactical ? 'rgba(0, 229, 255, 0.16)' : 'rgba(245, 158, 11, 0.16)';
      ctx.strokeStyle = isTactical ? '#00e5ff' : '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = isTactical ? 'rgba(0, 229, 255, 0.4)' : 'rgba(245, 158, 11, 0.4)';
      ctx.shadowBlur = 6;
    } else {
      ctx.fillStyle = 'rgba(18, 22, 32, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
    }
    
    drawChamferedRect(ctx, currentCX, currentCY, btnW, btnH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    
    ctx.fillStyle = isSelected ? (isTactical ? '#00e5ff' : '#ffffff') : '#8899aa';
    ctx.font = '900 10px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cat.toUpperCase(), currentCX + btnW / 2, currentCY + btnH / 2);
    
    _registerButton(currentCX, currentCY, btnW, btnH, () => {
       state.indexCategory = cat;
       state.indexPage = 0;
    });
    
    currentCX += btnW + 6;
  });

  const cardsStartY = currentCY + 32;
  const cardX = Math.max(16, (canvas.width - 508) / 2);
  const cardW = Math.min(canvas.width - 32, 508);
  const cardH = 118;
  const cardSpacing = 10;
  const itemsPerPage = 5;

  const filteredDefs = currentDefs.filter(def => 
    !state.indexCategory || state.indexCategory === 'All' || def.category === state.indexCategory
  );

  const totalPages = Math.max(1, Math.ceil(filteredDefs.length / itemsPerPage));
  if (state.indexPage === undefined) state.indexPage = 0;
  if (state.indexPage >= totalPages) state.indexPage = totalPages - 1;
  if (state.indexPage < 0) state.indexPage = 0;

  const startIdx = state.indexPage * itemsPerPage;
  const pageItems = filteredDefs.slice(startIdx, startIdx + itemsPerPage);

  pageItems.forEach((def, pos) => {
    const originalIdx = currentDefs.findIndex(d => d.id === def.id);
    const cardY = cardsStartY + pos * (cardH + cardSpacing);

    // Tactical Chamfered Panel
    drawPanel(cardX, cardY, cardW, cardH, 0.92, 8);

    // Left Accent Pip Line
    ctx.fillStyle = def.color || (isTactical ? '#00e5ff' : '#f59e0b');
    ctx.fillRect(cardX + 2, cardY + 12, 3, cardH - 24);

    // Fighter Preview Avatar & Glowing Stage
    const avatarX = cardX + 54;
    const avatarY = cardY + cardH / 2;
    const avatarSize = 68;

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(avatarX, avatarY + 28, avatarSize * 0.44, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const previewImg = getFighterPreview(originalIdx);
    if (previewImg) {
      ctx.drawImage(previewImg, avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
    } else {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Text Content Layout
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 16px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(def.name.toUpperCase(), cardX + 104, cardY + 14);

    // Category / Class Pill
    ctx.fillStyle = '#64748b';
    ctx.font = '900 9px "Rajdhani", sans-serif';
    ctx.fillText(`[ ${(def.category || 'GENERAL').toUpperCase()} // ${def.type.toUpperCase()} ]`, cardX + 104, cardY + 34);

    // Stat Telemetry
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9.5px "Rajdhani", monospace';
    ctx.fillText(`HP ${def.hp}  •  DMG ${def.damage}  •  SPD ${(def.speed || def.moveSpeed || 2)}  •  CD ${(def.cooldown / 60).toFixed(1)}s`, cardX + 104, cardY + 49);

    // Ability Header
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 10.5px "Rajdhani", sans-serif';
    ctx.fillText(`ABILITY // ${def.ability.toUpperCase()}`, cardX + 104, cardY + 65);

    // Description
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Rajdhani", Arial, sans-serif';
    wrapText(ctx, def.desc, cardX + 104, cardY + 79, cardW - 118, 12.5);

    // Register Card Click Action
    _registerButton(cardX, cardY, cardW, cardH, () => {
      state.indexInspectIndex = originalIdx;
      state.gameState = 'indexDetail';
    });
  });

  // ── Pagination Controls Bar ──
  const navY = cardsStartY + itemsPerPage * (cardH + cardSpacing) + 2;
  const navBtnW = 90;
  const navBtnH = 30;
  const navBtnCenterY = navY + navBtnH / 2;

  // Previous Page Button
  const prevBtnCenterX = cardX + navBtnW / 2;
  if (state.indexPage > 0) {
    drawButton('◄ PREV', prevBtnCenterX, navBtnCenterY, () => {
      state.indexPage--;
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
  ctx.fillText(`PAGE ${state.indexPage + 1} / ${totalPages}`, cardX + cardW / 2, navBtnCenterY);

  // Next Page Button
  const nextBtnLeftX = cardX + cardW - navBtnW;
  const nextBtnCenterX = nextBtnLeftX + navBtnW / 2;
  if (state.indexPage < totalPages - 1) {
    drawButton('NEXT ►', nextBtnCenterX, navBtnCenterY, () => {
      state.indexPage++;
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

  // Back Button in footer
  drawButton('⌂ BACK TO MENU', canvas.width / 2, canvas.height - 36, () => { goToTitle(); }, 140, 30, null, 4);
}

// ─────────────────────────────────────────────
// WEAPON MENU SCREEN
// ─────────────────────────────────────────────

function drawIndexDetailScreen() {
  const { ctx, canvas } = state;
  _clearButtons();
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const currentDefs = getActiveFighterDefs();
  const def = currentDefs[state.indexInspectIndex];
  if (!def) {
    state.gameState = 'index';
    return;
  }

  // 1. Sleek Gunmetal Cinematic Background
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, '#07080c');
  bgGrad.addColorStop(0.5, '#10131c');
  bgGrad.addColorStop(1, '#07080c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Top Header Bar (Navigation & Title - Shifted down to Y = 58)
  const headerY = 58;
  drawButton('← RETURN', 58, headerY, () => { state.gameState = 'index'; }, 85, 24, null, 4);

  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px "Outfit", "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.2)';
  ctx.shadowBlur = 8;
  ctx.fillText(`[ ${def.name.toUpperCase()} ]`, canvas.width / 2, headerY);
  ctx.restore();

  // Category Badge (Right side of header)
  ctx.fillStyle = '#64748b';
  ctx.font = '900 9px "Rajdhani", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`[ ${(def.category || 'GENERAL').toUpperCase()} // ${def.type.toUpperCase()} ]`, canvas.width - 16, headerY);

  const containerW = canvas.width - 32; // 508px
  const containerX = 16;

  // ── Tier 1: Fighter Hero Dossier & Stat Console (Y: 76 to 436, H: 360px) ──
  const dossierY = 76;
  const dossierH = 360;
  drawPanel(containerX, dossierY, containerW, dossierH, 0.94, 8);

  // Top Accent line
  ctx.fillStyle = def.color || '#f59e0b';
  ctx.fillRect(containerX + 16, dossierY + 2, containerW - 32, 2);

  // Left Avatar Showcase Stage (W: 130px)
  const avatarStageX = containerX + 70;
  const avatarStageY = dossierY + 80;
  const avatarSize = 80;

  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(avatarStageX, avatarStageY + 34, avatarSize * 0.46, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const previewImg = getFighterPreview(state.indexInspectIndex);
  if (previewImg) {
    ctx.drawImage(previewImg, avatarStageX - avatarSize / 2, avatarStageY - avatarSize / 2, avatarSize, avatarSize);
  } else {
    ctx.fillStyle = def.color || '#f59e0b';
    ctx.beginPath();
    ctx.arc(avatarStageX, avatarStageY, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  // Avatar Badge under stage
  ctx.fillStyle = 'rgba(18, 22, 32, 0.9)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, avatarStageX - 50, avatarStageY + 48, 100, 18, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 8.5px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LVL MAX // ${def.type.toUpperCase()}`, avatarStageX, avatarStageY + 57);

  // Right Side of Tier 1: Fighter Header & Identity
  const infoX = containerX + 144;
  let curY = dossierY + 14;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 18px "Outfit", "Rajdhani", sans-serif';
  ctx.fillText(def.name.toUpperCase(), infoX, curY);
  curY += 22;

  ctx.fillStyle = '#64748b';
  ctx.font = '900 8.5px "Rajdhani", sans-serif';
  ctx.fillText(`CLASS // ${def.type.toUpperCase()}  •  ROLE // ${(def.category || 'COMBATANT').toUpperCase()}`, infoX, curY);
  curY += 16;

  // Ability Header
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 10.5px "Rajdhani", sans-serif';
  ctx.fillText(`ABILITY // ${def.ability ? def.ability.toUpperCase() : 'STANDARD'}`, infoX, curY);
  curY += 22;

  // Stat Bars inside Dossier
  const statBarW = containerW - 158;
  const fighterSpeed = def.moveSpeed || 5;
  drawStatBar(ctx, 'HP', def.hp, 150, infoX, curY, statBarW, '#dc2626');
  curY += 20;
  drawStatBar(ctx, 'DMG', def.damage, 60, infoX, curY, statBarW, '#f59e0b');
  curY += 20;
  drawStatBar(ctx, 'CD', `${(def.cooldown / 60).toFixed(1)}s`, 2.0, infoX, curY, statBarW, '#94a3b8');
  curY += 20;
  drawStatBar(ctx, 'SPD', fighterSpeed.toFixed(1), 10, infoX, curY, statBarW, '#94a3b8');
  curY += 24;

  // Divider Line across full Dossier width
  const descY = dossierY + 180;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(containerX + 16, descY);
  ctx.lineTo(containerX + containerW - 16, descY);
  ctx.stroke();

  // Technical Dossier Text Section
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 10px "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('TECHNICAL DOSSIER & TACTICAL ANALYSIS //', containerX + 16, descY + 8);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "Rajdhani", Arial, sans-serif';
  wrapText(ctx, def.desc || '', containerX + 16, descY + 24, containerW - 32, 13);

  // ── Tier 2: Live Combat Simulator Range Window (Y: 444 to 876, H: 432px) ──
  const simY = 444;
  const simH = 432;
  drawPanel(containerX, simY, containerW, simH, 0.94, 8);

  // Demo Arena Header Bar inside Panel
  ctx.fillStyle = 'rgba(12, 15, 22, 0.95)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, containerX + 2, simY + 2, containerW - 4, 28, 5);
  ctx.fill();
  ctx.stroke();

  // Live Pulse Dot & Label
  const dotPulse = Math.sin(Date.now() / 250) > 0;
  ctx.fillStyle = dotPulse ? '#f59e0b' : '#78350f';
  ctx.beginPath();
  ctx.arc(containerX + 16, simY + 16, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 11px "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('LIVE COMBAT SIMULATOR // TARGET RANGE', containerX + 28, simY + 16);

  // Playback Speed Steppers in header
  const currentSpeed = (state.indexDemoSpeed !== undefined) ? state.indexDemoSpeed : 1.0;
  drawButton(currentSpeed === 0 ? '▶ PLAY' : '⏸ PAUSE', containerX + containerW - 188, simY + 16, () => {
    state.indexDemoSpeed = currentSpeed === 0 ? 1.0 : 0;
  }, 58, 20, null, 2);

  drawButton(currentSpeed === 0.5 ? '● 0.5x' : '0.5x', containerX + containerW - 124, simY + 16, () => {
    state.indexDemoSpeed = 0.5;
  }, 38, 20, null, 2);

  drawButton(currentSpeed === 1.0 ? '● 1.0x' : '1.0x', containerX + containerW - 82, simY + 16, () => {
    state.indexDemoSpeed = 1.0;
  }, 38, 20, null, 2);

  drawButton(currentSpeed === 2.0 ? '● 2.0x' : '2.0x', containerX + containerW - 40, simY + 16, () => {
    state.indexDemoSpeed = 2.0;
  }, 38, 20, null, 2);

  // Define Demo Area coordinates inside panel (Spacious 496px × 360px Arena!)
  const demoInnerY = simY + 32;
  const demoInnerH = 370;
  const demoArea = { x: containerX + 6, y: demoInnerY, width: containerW - 12, height: demoInnerH };

  // Clip combat rendering inside the demo window
  ctx.save();
  ctx.beginPath();
  drawChamferedRect(ctx, demoArea.x, demoArea.y, demoArea.width, demoArea.height, 6);
  ctx.clip();

  // Draw grid background inside demo area
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  const gridSize = 28;
  for (let gx = demoArea.x; gx < demoArea.x + demoArea.width; gx += gridSize) {
    ctx.beginPath();
    ctx.moveTo(gx, demoArea.y);
    ctx.lineTo(gx, demoArea.y + demoArea.height);
    ctx.stroke();
  }
  for (let gy = demoArea.y; gy < demoArea.y + demoArea.height; gy += gridSize) {
    ctx.beginPath();
    ctx.moveTo(demoArea.x, gy);
    ctx.lineTo(demoArea.x + demoArea.width, gy);
    ctx.stroke();
  }

  // Update & Render Fighter Demo State
  const demoState = updateIndexDetailDemo(def, demoArea);
  const fighter = demoState.fighter;
  const target = demoState.target;

  // Target Dummy Pulsing Ring
  if (!demoState.hideTarget) {
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(demoState.frame / 12));
    ctx.save();
    ctx.globalAlpha = pulse * 0.9;
    ctx.beginPath();
    ctx.arc(target.x, target.y, target.r + 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 77, 77, 0.18)';
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(target.x, target.y, target.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 77, 77, 0.9)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Target Crosshair Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(target.x - target.r - 6, target.y);
    ctx.lineTo(target.x + target.r + 6, target.y);
    ctx.moveTo(target.x, target.y - target.r - 6);
    ctx.lineTo(target.x, target.y + target.r + 6);
    ctx.stroke();
  }

  // Projectiles
  const projectiles = previewProjectileSystem.getProjectiles();
  projectiles.forEach((p) => {
    if (p.isGrenade) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(1, 0.8);
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.75, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    } else if (p.visual === 'layla_bomb') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.beginPath();
      ctx.arc(0, 0, (p.r || 6) * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = '#00ffff';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    } else if (p.isShuriken) {
      p.spinAngle = (p.spinAngle || 0) + 0.25;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spinAngle);
      ctx.fillStyle = '#2f4f4f';
      ctx.strokeStyle = '#a0a0a0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
        ctx.lineTo(Math.cos(a + Math.PI / 4) * 3, Math.sin(a + Math.PI / 4) * 3);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (p.isSniper) {
      ctx.save();
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    } else if (p.isFlame) {
      ctx.save();
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.r || 4) * (1 + Math.sin(Date.now() / 50) * 0.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.isZeus) {
      ctx.save();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 1.2, p.y - p.vy * 1.2);
      ctx.lineTo(p.x - p.vx * 0.6 + (Math.random() - 0.5) * 6, p.y - p.vy * 0.6 + (Math.random() - 0.5) * 6);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    } else if (p.isAimbot) {
      ctx.save();
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r || 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = p.color || '#fff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r || 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  // Render Fighter Body & Animations
  fighter.draw(ctx, target);

  ctx.restore(); // Restore Arena Clip

  // Bottom of Arena Window: Animation Mode Chips Bar (Y: simY + 412)
  const animDeckY = simY + 412;
  const animBtns = [
    { id: 'basic', label: 'BASIC ATK' }
  ];

  if (def.type === 'gojo') {
    animBtns.push({ id: 'mixing', label: 'LAPSE BLUE' }, { id: 'red', label: 'REVERSAL RED' }, { id: 'domain', label: 'UNLIMITED VOID' });
  } else if (def.type === 'sukuna') {
    animBtns.push({ id: 'flurry', label: 'DISMANTLE' }, { id: 'fuga', label: 'FUGA ARROW' }, { id: 'domain', label: 'MALEVOLENT SHRINE' });
  } else if (def.type === 'toji') {
    animBtns.push({ id: 'spear', label: 'ISOH CHOP' }, { id: 'stealth', label: 'AMBUSH STRIKE' });
  } else if (def.type === 'todo') {
    animBtns.push({ id: 'clap', label: 'BOOGIE WOOGIE' }, { id: 'takada', label: 'TAKADA CHAN' });
  } else if (def.type === 'saitama') {
    animBtns.push({ id: 'flurry', label: 'CONSECUTIVE PUNCHES' }, { id: 'counter', label: 'SERIOUS PUNCH' });
  } else if (def.type === 'genos') {
    animBtns.push({ id: 'incinerate', label: 'INCINERATION CANNON' });
  } else if (def.type === 'ichigo') {
    animBtns.push({ id: 'hollow', label: 'HOLLOW MASK' }, { id: 'getsuga', label: 'GETSUGA TENSHO' }, { id: 'bankai', label: 'BANKAI' });
  } else {
    animBtns.push({ id: 'ability', label: (def.ability || 'SPECIAL SKILL').toUpperCase() });
  }

  const activeAnim = state.indexDemoAnim || 'basic';
  const totalAnimW = animBtns.length * 115 + (animBtns.length - 1) * 8;
  let animStartX = (canvas.width - totalAnimW) / 2;

  animBtns.forEach((btn) => {
    const isActive = activeAnim === btn.id;
    const btnW = 115;
    const btnH = 26;

    ctx.save();
    if (isActive) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
      ctx.shadowBlur = 6;
    } else {
      ctx.fillStyle = 'rgba(18, 22, 32, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
    }
    drawChamferedRect(ctx, animStartX, animDeckY, btnW, btnH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = isActive ? '#ffffff' : '#8899aa';
    ctx.font = '900 9.5px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, animStartX + btnW / 2, animDeckY + btnH / 2);

    _registerButton(animStartX, animDeckY, btnW, btnH, () => {
      unlockAudio();
      state.indexDemoAnim = btn.id;
      resetIndexDetailState(def, demoArea);

      if (btn.id === 'mixing') audioSystem.playSFX('skill_mixing', 3.0);
      else if (btn.id === 'red') audioSystem.playSFX('skill_redcharging', 2.0);
      else if (btn.id === 'domain' && def.type === 'gojo') audioSystem.playSFX('skill_gojodomain', 5.0);
      else if (btn.id === 'fuga') audioSystem.playSFX('skill_fuga', 3.5);
      else if (btn.id === 'domain' && def.type === 'sukuna') audioSystem.playSFX('skill_domainexpansion', 5.5);
      else if (btn.id === 'flurry' && def.type === 'saitama') audioSystem.playSFX('skill_dash3', 1.0);
      else if (btn.id === 'counter' && def.type === 'saitama') audioSystem.playSFX(CONFIG.saitama?.counterPunchVoiceSFX || 'Assets/Sound Effects/Skills/saitama-seriouspunch-voiceline.mp3', 3.0);
      else if (btn.id === 'flurry') audioSystem.playSFX('skill_spinslash', 2.0);
      else if (btn.id === 'spear') audioSystem.playSFX('attack_swordswing', 1.0);
      else if (btn.id === 'stealth') audioSystem.playSFX('skill_dash5', 1.0);
      else if (btn.id === 'clap') audioSystem.playSFX('skill_todoclap', 2.0);
      else if (btn.id === 'takada') audioSystem.playSFX(CONFIG.todo?.takadaVoiceSound || 'Assets/Sound Effects/SkillEffects/todo-voiceline-mybestfriend.mp3', 3.0);
      else if (btn.id === 'hollow' && def.type === 'ichigo') audioSystem.playSFX('Assets/Sound Effects/SkillEffects/flare.mp3', 0.9);
      else if (btn.id === 'getsuga' && def.type === 'ichigo') audioSystem.playSFX('Assets/Sound Effects/Skills/Ichigo-getsugatensho-flashstep-voiceline.mp3', 1.0);
      else if (btn.id === 'bankai' && def.type === 'ichigo') audioSystem.playSFX('Assets/Sound Effects/Skills/Ichigo-bankai-charging-voiceline.mp3', 1.0);
      else if (btn.id === 'incinerate' && def.type === 'genos') {
        if (CONFIG.genos?.ultVoiceEnabled !== false) {
          audioSystem.playSFX(CONFIG.genos?.ultVoiceSound || 'Assets/Sound Effects/Skills/genos-incenerate-voice.mp3', CONFIG.genos?.ultVoiceVolume ?? 3.5);
        }
        if (CONFIG.genos?.ultChargeEnabled) {
          audioSystem.playSFX(CONFIG.genos?.ultChargeSound || 'Assets/Sound Effects/Skills/genos-incenerate-charging.mp3', CONFIG.genos?.ultChargeVolume ?? 2.0);
        }
      }
    });

    animStartX += btnW + 8;
  });

  // ── Tier 3: Bottom Navigation Dock ──
  const dockY = canvas.height - 34;
  const currentIdx = state.indexInspectIndex;

  // Previous Fighter Button
  drawButton('◄ PREV FIGHTER', 90, dockY, () => {
    state.indexInspectIndex = (currentIdx - 1 + currentDefs.length) % currentDefs.length;
    state.indexDetailFighter = null;
  }, 130, 28, null, 4);

  // Return to Index Button
  drawButton('⌂ RETURN TO INDEX', canvas.width / 2, dockY, () => {
    state.gameState = 'index';
  }, 140, 28, null, 4);

  // Next Fighter Button
  drawButton('NEXT FIGHTER ►', canvas.width - 90, dockY, () => {
    state.indexInspectIndex = (currentIdx + 1) % currentDefs.length;
    state.indexDetailFighter = null;
  }, 130, 28, null, 4);
}


let selectInspectedIndex = 0;
let previewFighterInstance = null;
let lastInspectedIndex = -1;



export { drawIndexScreen, drawIndexDetailScreen, updatePreviewBalls };

const eventTarget = state.pixiApp ? state.pixiApp.view : state.canvas;
if (eventTarget && typeof eventTarget.addEventListener === 'function') {
  eventTarget.addEventListener('wheel', (e) => {
    if (state.gameState === 'index') {
      e.preventDefault();
    const currentDefs = getActiveFighterDefs();
    const filteredDefs = currentDefs.filter(def => 
      !state.indexCategory || state.indexCategory === 'All' || def.category === state.indexCategory
    );
    const totalPages = Math.ceil(filteredDefs.length / 5);
    if (e.deltaY > 0 && state.indexPage < totalPages - 1) {
      state.indexPage++;
    } else if (e.deltaY < 0 && state.indexPage > 0) {
      state.indexPage--;
    }
    return;
  }
}, { passive: false });
}
