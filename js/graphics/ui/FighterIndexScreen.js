import { audioSystem } from '../../systems/audioSystem.js';
import { unlockAudio } from '../../systems/soundSystem.js';
import { goToTitle } from '../../core/gameFlow.js';
import { state } from '../../core/state.js';
import { CONFIG, FIGHTER_DEFS } from '../../core/config.js';
import { clearHealthHud } from '../hudManager.js?v=6';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawPremiumStatBar, drawStatBar } from './uiFramework.js';
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
        color: Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(160, 160, 175, 0.06)',
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
  updatePreviewBalls();

  // Header Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(120, 180, 255, 0.6)';
  ctx.shadowBlur = 10;
  ctx.fillText('FIGHTER INDEX', canvas.width / 2, 42);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#888';
  ctx.font = '12px Arial';
  ctx.fillText('Browse champion abilities and stats, or click a card for detail', canvas.width / 2, 64);

  // Category Filter Pills
  const categories = ['All', 'Greek Mythology', 'Japanese', 'Sci-Fi & Modern', 'Fantasy & Magic'];
  
  const catXStart = 20;
  let currentCX = catXStart;
  let currentCY = 76;
  
  categories.forEach(cat => {
    ctx.font = 'bold 11px Arial';
    const textW = ctx.measureText(cat).width;
    const btnW = textW + 16;
    const btnH = 24;
    
    if (currentCX + btnW > canvas.width - 20) {
      currentCX = catXStart;
      currentCY += btnH + 6;
    }
    
    const isSelected = (state.indexCategory || 'All') === cat;
    
    ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.9)' : 'rgba(40, 45, 60, 0.85)';
    ctx.strokeStyle = isSelected ? '#ffd700' : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(currentCX, currentCY, btnW, btnH, 12);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = isSelected ? '#000000' : 'rgba(255, 255, 255, 0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cat, currentCX + btnW / 2, currentCY + btnH / 2);
    
    _registerButton(currentCX, currentCY, btnW, btnH, () => {
       state.indexCategory = cat;
       state.indexPage = 0; // Reset page on category change
    });
    
    currentCX += btnW + 6;
  });

  const cardsStartY = currentCY + 34;
  const cardX = Math.max(20, (canvas.width - 500) / 2);
  const cardW = Math.min(canvas.width - 40, 500);
  const cardH = 118;
  const cardSpacing = 14;
  const itemsPerPage = 5;

  const filteredDefs = FIGHTER_DEFS.filter(def => 
    !state.indexCategory || state.indexCategory === 'All' || def.category === state.indexCategory
  );

  const totalPages = Math.max(1, Math.ceil(filteredDefs.length / itemsPerPage));
  if (state.indexPage === undefined) state.indexPage = 0;
  if (state.indexPage >= totalPages) state.indexPage = totalPages - 1;
  if (state.indexPage < 0) state.indexPage = 0;

  const startIdx = state.indexPage * itemsPerPage;
  const pageItems = filteredDefs.slice(startIdx, startIdx + itemsPerPage);

  pageItems.forEach((def, pos) => {
    const originalIdx = FIGHTER_DEFS.findIndex(d => d.id === def.id);
    const cardY = cardsStartY + pos * (cardH + cardSpacing);

    // Glassmorphism Card Container
    ctx.save();
    ctx.fillStyle = 'rgba(20, 25, 35, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 10);
    ctx.fill();
    ctx.stroke();

    // Glowing Left Accent Line
    ctx.fillStyle = def.color;
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY + 10, 4, cardH - 20, 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Fighter Preview Avatar
    const avatarX = cardX + 48;
    const avatarY = cardY + cardH / 2;
    const avatarSize = 64;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const pedGrad = ctx.createRadialGradient(avatarX, avatarY, 0, avatarX, avatarY, avatarSize / 2);
    pedGrad.addColorStop(0, `rgba(255, 255, 255, 0.15)`);
    pedGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = pedGrad;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarSize / 2 + 4, 0, Math.PI * 2);
    ctx.fill();
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
    ctx.fillStyle = def.color;
    ctx.font = 'bold 17px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(def.name.toUpperCase(), cardX + 96, cardY + 12);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 10px Arial';
    ctx.fillText(`CLASS: ${def.type.toUpperCase()}  |  HP ${def.hp}  DMG ${def.damage}  CD ${(def.cooldown / 60).toFixed(1)}s`, cardX + 96, cardY + 34);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 11px Arial';
    ctx.fillText(def.ability, cardX + 96, cardY + 50);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '11px Arial';
    wrapText(ctx, def.desc, cardX + 96, cardY + 68, cardW - 110, 15);

    // Register Card Click Action
    _registerButton(cardX, cardY, cardW, cardH, () => {
      state.indexInspectIndex = originalIdx;
      state.gameState = 'indexDetail';
    });
  });

  // ── Pagination Controls Bar ──
  const navY = cardsStartY + itemsPerPage * (cardH + cardSpacing) + 2;
  const navBtnW = 80;
  const navBtnH = 30;
  const navBtnCenterY = navY + navBtnH / 2;

  // Previous Page Button
  const prevBtnCenterX = cardX + navBtnW / 2;
  if (state.indexPage > 0) {
    drawButton('◄ PREV', prevBtnCenterX, navBtnCenterY, () => {
      state.indexPage--;
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
  ctx.fillText(`PAGE ${state.indexPage + 1} / ${totalPages}`, cardX + cardW / 2, navBtnCenterY);

  // Next Page Button
  const nextBtnLeftX = cardX + cardW - navBtnW;
  const nextBtnCenterX = nextBtnLeftX + navBtnW / 2;
  if (state.indexPage < totalPages - 1) {
    drawButton('NEXT ►', nextBtnCenterX, navBtnCenterY, () => {
      state.indexPage++;
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

  // Back Button in footer
  drawButton('⌂ BACK', cardX + 50, canvas.height - 40, () => { goToTitle(); }, 100, 35);
}

// ─────────────────────────────────────────────
// WEAPON MENU SCREEN
// ─────────────────────────────────────────────


function drawIndexDetailScreen() {
  const { ctx, canvas } = state;
  _clearButtons();
  clearHealthHud();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const def = FIGHTER_DEFS[state.indexInspectIndex];
  if (!def) {
    state.gameState = 'index';
    return;
  }

  // 1. Cinematic Background & Signature Radial Aura
  const bgGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.8);
  bgGrad.addColorStop(0, '#0f141e');
  bgGrad.addColorStop(1, '#020305');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let r = 0, g = 150, b = 255;
  if (def.color && def.color.startsWith('#') && def.color.length === 7) {
    r = parseInt(def.color.slice(1, 3), 16);
    g = parseInt(def.color.slice(3, 5), 16);
    b = parseInt(def.color.slice(5, 7), 16);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(canvas.width * 0.7, canvas.height * 0.45, 0, canvas.width * 0.7, canvas.height * 0.45, 260);
  glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.20)`);
  glow.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, 0.04)`);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // 2. Top Header Bar (Navigation & Title)
  const headerY = 22;
  drawButton('← INDEX', 65, headerY, () => { state.gameState = 'index'; }, 95, 28);

  ctx.fillStyle = def.color || '#FFD700';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(def.name.toUpperCase(), canvas.width / 2, headerY);

  // Title Accent Line
  ctx.fillStyle = def.color || '#FFD700';
  ctx.shadowColor = def.color || '#FFD700';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.roundRect(canvas.width / 2 - 35, headerY + 12, 70, 2, 1);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Category Badge (Right side of header)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`[ ${(def.category || 'ANIME').toUpperCase()} / ${def.type.toUpperCase()} ]`, canvas.width - 25, headerY);

  // 3. Two-Column Layout Calculations
  const gap = 20;
  const maxContainerW = 760;
  const totalW = Math.min(canvas.width - 40, maxContainerW);
  const leftW = Math.floor(totalW * 0.44);
  const rightW = totalW - leftW - gap;

  const startX = (canvas.width - totalW) / 2;
  const startY = 62;
  const panelH = Math.min(canvas.height - startY - 15, 430);

  const leftX = startX;
  const rightX = startX + leftW + gap;

  // 4. LEFT PANEL: Fighter Stats & Profile Card
  drawPanel(leftX, startY, leftW, panelH, 0.88, 12);
  ctx.save();
  ctx.strokeStyle = def.color || '#FFD700';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(leftX, startY, leftW, panelH, 12);
  ctx.stroke();
  ctx.restore();

  let curY = startY + 18;

  // Explicitly reset canvas text alignment properties
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Name & Category Tag
  ctx.fillStyle = def.color || '#FFFFFF';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(def.name.toUpperCase(), leftX + 18, curY);
  curY += 24;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = 'bold 10px Arial';
  ctx.fillText(`CLASS: ${def.type.toUpperCase()}`, leftX + 18, curY);
  curY += 18;

  // Ability Name
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 11px Arial';
  ctx.fillText(`⚡ ABILITY: ${def.ability || 'Standard'}`, leftX + 18, curY);
  curY += 32;

  // Stat Bars (Spacing 32px to account for label offset)
  const statBarW = leftW - 36;
  const fighterSpeed = def.moveSpeed || 5;
  drawPremiumStatBar(ctx, leftX + 18, curY, statBarW, 'HEALTH', `${def.hp} HP`, Math.min(1.0, def.hp / 300), '#4da3ff');
  curY += 32;
  drawPremiumStatBar(ctx, leftX + 18, curY, statBarW, 'DAMAGE', `${def.damage} DMG`, Math.min(1.0, def.damage / 40), '#ff4d4d');
  curY += 32;
  drawPremiumStatBar(ctx, leftX + 18, curY, statBarW, 'COOLDOWN', `${(def.cooldown / 60).toFixed(1)}s`, Math.max(0.1, 1 - (def.cooldown / 120)), '#ffd700');
  curY += 32;
  drawPremiumStatBar(ctx, leftX + 18, curY, statBarW, 'SPD', `${fighterSpeed.toFixed(1)} SPD`, Math.min(1.0, fighterSpeed / 10), '#55ff55');
  curY += 32;

  // ATK RANGE stat for applicable fighters
  if (def.type === 'mahito') {
    const baseReach = CONFIG.mahito?.punchRange || 75;
    const bodyR = def.radius || 25;
    const totalRange = bodyR + baseReach;
    drawPremiumStatBar(ctx, leftX + 18, curY, statBarW, 'ATK RANGE', `${bodyR} + ${baseReach} (${totalRange}px)`, Math.min(1.0, totalRange / 200), '#D946EF');
    curY += 22;
  } else if (def.type === 'nanami') {
    const baseReach = CONFIG.nanami?.cleaverRange || 65;
    const bodyR = def.radius || 25;
    const totalRange = bodyR + baseReach;
    drawPremiumStatBar(ctx, leftX + 18, curY, statBarW, 'ATK RANGE', `${bodyR} + ${baseReach} (${totalRange}px)`, Math.min(1.0, totalRange / 200), '#D4AF37');
    curY += 22;
  } else {
    curY += 22;
  }

  // Divider Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftX + 18, curY);
  ctx.lineTo(leftX + leftW - 18, curY);
  ctx.stroke();
  curY += 14;

  // Description Section (Reset text align and baseline)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = 'bold 10px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('DESCRIPTION:', leftX + 18, curY);
  curY += 16;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '11px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  wrapText(ctx, def.desc || '', leftX + 18, curY, leftW - 36, 15);

  // 5. RIGHT PANEL: Live Combat Demo Arena Window
  drawPanel(rightX, startY, rightW, panelH, 0.90, 12);
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(rightX, startY, rightW, panelH, 12);
  ctx.stroke();
  ctx.restore();

  // Demo Arena Header Bar inside Panel
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.roundRect(rightX + 2, startY + 2, rightW - 4, 28, { tl: 10, tr: 10, bl: 0, br: 0 });
  ctx.fill();

  // Live Pulse Dot & Label
  const dotPulse = Math.sin(Date.now() / 250) > 0;
  ctx.fillStyle = dotPulse ? '#00FF88' : '#009944';
  ctx.beginPath();
  ctx.arc(rightX + 16, startY + 16, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('LIVE COMBAT DEMO', rightX + 26, startY + 16);

  // Demo Subtext
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '10px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('AI Movement & Targeting', rightX + rightW - 14, startY + 16);

  // Define Demo Area coordinates inside panel
  const demoInnerY = startY + 34;
  const demoInnerH = panelH - 44;
  const demoArea = { x: rightX + 6, y: demoInnerY, width: rightW - 12, height: demoInnerH };

  // Clip combat rendering inside the demo window
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(demoArea.x, demoArea.y, demoArea.width, demoArea.height, 8);
  ctx.clip();

  // Draw grid background inside demo area
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  const gridSize = 30;
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

  // Target Dummy Pulsing Ring (Hidden during special animation demonstrations)
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

  // Projectiles (Custom & Signature Visuals for each character type)
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
      drawLaylaBomb(ctx, p);
      ctx.restore();
    } else if (p.visual === 'layla_cosmic_blast') {
      ctx.save();
      ctx.translate(p.x, p.y);
      drawLaylaCosmicBlast(ctx, p);
      ctx.restore();
    } else if (p.visual === 'layla_ultimate_bullet') {
      ctx.save();
      ctx.translate(p.x, p.y);
      drawLaylaUltimateBullet(ctx, p);
      ctx.restore();
    } else if (p.visual === 'layla_basic_bullet') {
      ctx.save();
      ctx.translate(p.x, p.y);
      drawLaylaBasicBullet(ctx, p);
      ctx.restore();
    } else if (p.isGojoBlue) {
      // Gojo Blue Sphere with Glowing Aura
      ctx.save();
      ctx.translate(p.x, p.y);
      const auraGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
      auraGrad.addColorStop(0, 'rgba(0, 229, 255, 0.9)');
      auraGrad.addColorStop(0.5, 'rgba(0, 150, 255, 0.4)');
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.isGhostBlade) {
      // Sukuna Dismantle Ghost Blade Slash Arc
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle || 0);
      ctx.strokeStyle = 'rgba(255, 70, 70, 0.95)';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 16, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    } else if (p.isShuriken) {
      // DarkSlateGray Spinning Shuriken
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
      // Red Sniper Tracer Beam
      ctx.save();
      ctx.strokeStyle = '#ff0055';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 1.5, p.y - p.vy * 1.5);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    } else if (p.isFlame) {
      // Orange Flamethrower Burst
      ctx.save();
      ctx.fillStyle = '#ff6600';
      ctx.shadowColor = '#ff3300';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, (p.r || 4) * (1 + Math.sin(Date.now() / 50) * 0.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.isZeus) {
      // Zeus Lightning Bolt
      ctx.save();
      ctx.strokeStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(p.x - p.vx * 1.2, p.y - p.vy * 1.2);
      ctx.lineTo(p.x - p.vx * 0.6 + (Math.random() - 0.5) * 6, p.y - p.vy * 0.6 + (Math.random() - 0.5) * 6);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    } else if (p.isAimbot) {
      // Aimbot Homing Bullet
      ctx.save();
      ctx.fillStyle = '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Default Styled Energy Bullet with Glow
      ctx.save();
      ctx.fillStyle = p.color || '#ffffff';
      ctx.shadowColor = p.color || '#ffffff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r || 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

  // Impacts
  const impacts = previewProjectileSystem.getImpacts();
  impacts.forEach((effect) => {
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = Math.max(0, effect.life / 14);
    ctx.stroke();
  });

  // Draw Demo Fighter
  fighter.draw(ctx, target);

  ctx.restore(); // Restore clip

  // 5. Playback Speed & Rotation Controls Bar (Cleanly integrated at bottom of right card)
  const currentSpeed = (state.indexDemoSpeed !== undefined) ? state.indexDemoSpeed : 1.0;
  const ctrlY1 = startY + panelH - 18;
  const btnCount = 5;
  const btnW = Math.floor((rightW - 32) / btnCount);
  const btnH = 22;
  const totalBtnsW = btnW * btnCount + (btnCount - 1) * 4;
  let btnX = rightX + (rightW - totalBtnsW) / 2 + btnW / 2;

  const controlButtons = [
    {
      label: currentSpeed === 0 ? '▶ PLAY' : '⏸ STOP',
      action: () => { state.indexDemoSpeed = currentSpeed === 0 ? 1.0 : 0; },
      active: currentSpeed === 0,
      glowColor: '#FF4444'
    },
    {
      label: '0.5x',
      action: () => { state.indexDemoSpeed = 0.5; },
      active: currentSpeed === 0.5,
      glowColor: '#00FF88'
    },
    {
      label: '1.0x',
      action: () => { state.indexDemoSpeed = 1.0; },
      active: currentSpeed === 1.0,
      glowColor: '#00FF88'
    },
    {
      label: '2.0x',
      action: () => { state.indexDemoSpeed = 2.0; },
      active: currentSpeed === 2.0,
      glowColor: '#00FF88'
    },
    {
      label: '🔄 ROTATE',
      action: () => {
        state.indexDemoRotation = ((state.indexDemoRotation || 0) + Math.PI / 2) % (Math.PI * 2);
      },
      active: !!state.indexDemoRotation,
      glowColor: '#FFD700'
    }
  ];

  controlButtons.forEach((btn) => {
    const isCurActive = btn.active;
    drawButton(btn.label, btnX, ctrlY1, btn.action, btnW, btnH);

    // Glowing highlight for active control option
    if (isCurActive) {
      ctx.save();
      const color = btn.glowColor || '#00FF88';
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(btnX - btnW / 2 - 1, ctrlY1 - btnH / 2 - 1, btnW + 2, btnH + 2, 5);
      ctx.stroke();
      ctx.restore();
    }

    btnX += btnW + 4;
  });

  // 6. Animation Demonstration Controls Panel (Simple & Clean)
  const bottomY = startY + panelH + 14;
  const bottomH = Math.max(72, canvas.height - bottomY - 16);

  drawPanel(startX, bottomY, totalW, bottomH, 0.88, 14);

  // Simple Clean Header
  ctx.fillStyle = def.color || '#FFD700';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('⚡ ANIMATION DEMO', startX + 16, bottomY + 12);

  // Dynamic Button List for Character Animations
  const animBtns = [
    { id: 'basic', label: '⚔️ Basic' }
  ];

  if (def.type === 'gojo') {
    animBtns.push(
      { id: 'mixing', label: '🔮 Mixing' },
      { id: 'red', label: '🔴 Red' },
      { id: 'domain', label: '🌌 Void' }
    );
  } else if (def.type === 'sukuna') {
    animBtns.push(
      { id: 'flurry', label: '⚔️ Flurry' },
      { id: 'fuga', label: '🔥 Fuga' },
      { id: 'domain', label: '🏯 Shrine' }
    );
  } else if (def.type === 'toji') {
    animBtns.push(
      { id: 'spear', label: '🗡️ Spear' },
      { id: 'stealth', label: '🥷 Stealth' }
    );
  } else if (def.type === 'todo') {
    animBtns.push(
      { id: 'rock', label: '🪨 Rock' },
      { id: 'clap', label: '👏 Clap' },
      { id: 'takada', label: '♥ Takada' }
    );
  } else if (def.type === 'mahoraga') {
    animBtns.push(
      { id: 'level8', label: '⚡ Level 8' }
    );
  } else if (def.type === 'zeus') {
    animBtns.push(
      { id: 'lightning', label: '⚡ Lightning' }
    );
  } else if (def.type === 'genos') {
    animBtns.push(
      { id: 'incinerate', label: '🔥 Incinerate' }
    );
  } else {
    animBtns.push(
      { id: 'ability', label: `✨ ${(def.ability || 'Ability').slice(0, 10)}` }
    );
  }

  const activeAnim = state.indexDemoAnim || 'basic';
  const bWidth = 110;
  const bHeight = 28;
  let bX = startX + 16 + bWidth / 2;
  const bY = bottomY + 40;

  animBtns.forEach((btn) => {
    const isActive = activeAnim === btn.id;

    drawButton(btn.label, bX, bY, () => {
      unlockAudio();
      state.indexDemoAnim = btn.id;
      // Completely reset the demo state (fighter pos, target HP/pos, projectiles) when switching animations
      const demoInnerY = startY + 34;
      const demoInnerH = panelH - 44;
      const demoArea = { x: rightX + 6, y: demoInnerY, width: rightW - 12, height: demoInnerH };
      resetIndexDetailState(def, demoArea);

      // Play audio for the specific animation demo
      if (btn.id === 'mixing') audioSystem.playSFX('skill_mixing', 3.0);
      else if (btn.id === 'red') audioSystem.playSFX('skill_redcharging', 2.0);
      else if (btn.id === 'domain' && def.type === 'gojo') audioSystem.playSFX('skill_gojodomain', 5.0);
      else if (btn.id === 'fuga') audioSystem.playSFX('skill_fuga', 3.5);
      else if (btn.id === 'domain' && def.type === 'sukuna') audioSystem.playSFX('skill_domainexpansion', 5.5);
      else if (btn.id === 'flurry') audioSystem.playSFX('skill_spinslash', 2.0);
      else if (btn.id === 'spear') audioSystem.playSFX('attack_swordswing', 1.0);
      else if (btn.id === 'stealth') audioSystem.playSFX('skill_dash5', 1.0);
      else if (btn.id === 'rock') audioSystem.playSFX('skill_dash1', 1.0);
      else if (btn.id === 'clap') audioSystem.playSFX('skill_todoclap', 2.0);
      else if (btn.id === 'takada') audioSystem.playSFX(CONFIG.todo?.takadaVoiceSound || 'Assets/Sound Effects/SkillEffects/todo-voiceline-mybestfriend.mp3', 3.0);
      else if (btn.id === 'lightning') audioSystem.playSFX('skill_thunderstrike', 1.5);
      else if (btn.id === 'level8') audioSystem.playSFX('skill_dash5', 2.0);
      else if (btn.id === 'incinerate' && def.type === 'genos') {
        if (CONFIG.genos?.ultVoiceEnabled !== false) {
          audioSystem.playSFX(CONFIG.genos?.ultVoiceSound || 'Assets/Sound Effects/Skills/genos-incenerate-voice.mp3', CONFIG.genos?.ultVoiceVolume ?? 3.5);
        }
        if (CONFIG.genos?.ultChargeEnabled) {
          audioSystem.playSFX(CONFIG.genos?.ultChargeSound || 'Assets/Sound Effects/Skills/genos-incenerate-charging.mp3', CONFIG.genos?.ultChargeVolume ?? 2.0);
        }
      }
    }, bWidth, bHeight);

    if (isActive) {
      ctx.save();
      const glowColor = btn.id === 'basic' ? '#00FF88' : '#FFD700';
      ctx.strokeStyle = glowColor;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(bX - bWidth / 2 - 1, bY - bHeight / 2 - 1, bWidth + 2, bHeight + 2, 6);
      ctx.stroke();
      ctx.restore();
    }

    bX += bWidth + 12;
  });
}


let selectInspectedIndex = 0;
let previewFighterInstance = null;
let lastInspectedIndex = -1;



export { drawIndexScreen, drawIndexDetailScreen, updatePreviewBalls };

const eventTarget = state.pixiApp ? state.pixiApp.view : state.canvas;
eventTarget.addEventListener('wheel', (e) => {
  if (state.gameState === 'index') {
    e.preventDefault();
    const filteredDefs = FIGHTER_DEFS.filter(def => 
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
