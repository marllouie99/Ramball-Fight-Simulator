import { state, saveWeaponCustomizations } from '../../core/state.js';
import { FIGHTER_DEFS, CONFIG } from '../../core/config.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText } from './uiFramework.js';
import { drawWeaponPreview } from './WeaponIndexScreen.js';

// Currently selected weapon key in studio: 'mahito' | 'yuta' | 'toji' | 'cronos' | 'ruby'
if (state.studioSelectedWeapon === undefined) state.studioSelectedWeapon = 'mahito';
if (state.studioPreviewScale === undefined) state.studioPreviewScale = 2.4;
const ZOOM_MIN = 0.8;
const ZOOM_MAX = 6.0;
const ZOOM_STEP = 0.3;
const ZOOM_DEFAULT = 2.4;
// Selected detail group for editing: null | 'finger' | 'position' | 'scale_angle'
if (state.studioSelectedDetail === undefined) state.studioSelectedDetail = null;

// Interactive Drag States
let isDraggingBase = false;
let isDraggingTip = false;
let activeDragFinger = -1;
let activeDragType = null; // 'knuckle' | 'tip'

// Helper to initialize custom settings in state
function initCustomizations() {
  if (!state.weaponCustomizations) {
    state.weaponCustomizations = {
      mahito: {
        blades: [
          { idx: 0, knuckleX: 3.0, knuckleY: -6.5, fanAngle: -0.32, length: 82, heelWidth: 14.0, topArchY: -14.0, tipY: 16.0 },
          { idx: 1, knuckleX: 5.0, knuckleY: -3.8, fanAngle: -0.22, length: 88, heelWidth: 15.5, topArchY: -9.0, tipY: 18.0 },
          { idx: 2, knuckleX: 6.0, knuckleY: -0.8, fanAngle: -0.06, length: 84, heelWidth: 15.0, topArchY: -3.0, tipY: 24.0 },
          { idx: 3, knuckleX: 1.5, knuckleY: 9.0, fanAngle: 0.48, length: 80, heelWidth: 14.5, topArchY: 18.0, tipY: -22.0 }
        ],
        drawOrder: [0, 1, 2, 3],
        weaponScale: 1.0
      },
      yuta: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
      toji: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
      cronos: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
      ruby: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
      nanami: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
      john_wick: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 }
    };
    // Sync state.mahitoClawCustomBlades with the new unified structure
    state.mahitoClawCustomBlades = state.weaponCustomizations.mahito.blades;
  }
  // Ensure drawOrder exists (migration for older saves)
  if (!state.weaponCustomizations.mahito.drawOrder) {
    state.weaponCustomizations.mahito.drawOrder = [0, 1, 2, 3];
  }
  if (state.weaponCustomizations.mahito.weaponScale === undefined) {
    state.weaponCustomizations.mahito.weaponScale = 1.0;
  }
}

export function drawWeaponStudioScreen() {
  const { ctx, canvas } = state;
  initCustomizations();

  // 1. Reset Context for Title/UI Screens
  ctx.resetTransform();
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;

  _clearButtons();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Background (Radial Dark Gradient)
  const bgGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width * 0.8);
  bgGrad.addColorStop(0, '#0a0d14');
  bgGrad.addColorStop(1, '#020305');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const activeWeaponKey = state.studioSelectedWeapon;
  const activeDef = FIGHTER_DEFS.find(f => f.type === activeWeaponKey);
  const themeColor = activeDef?.color || '#FFD700';

  // 3. Glowing Radial Backlight for Weapon Preview
  const heroY = canvas.height * 0.35;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const glow = ctx.createRadialGradient(canvas.width / 2, heroY, 0, canvas.width / 2, heroY, 200);
  let r = 0, g = 150, b = 255;
  if (themeColor.startsWith('#') && themeColor.length === 7) {
    r = parseInt(themeColor.slice(1, 3), 16);
    g = parseInt(themeColor.slice(3, 5), 16);
    b = parseInt(themeColor.slice(5, 7), 16);
  }
  glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`);
  glow.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.05)`);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // 4. Draw Header Title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
  ctx.shadowBlur = 8;
  ctx.fillText('🛠️ WEAPON STUDIO', canvas.width / 2, 45);
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '11px Arial';
  ctx.fillText('Interactive customization. Select a parameter details card to adjust.', canvas.width / 2, 65);

  // 5. Draw Weapon Hero Preview
  const currentScale = state.studioPreviewScale;
  
  if (state.studioPixelArtMode) {
    const pixelFactor = 0.30; // Lower = chunkier pixels
    const pw = Math.ceil(canvas.width * pixelFactor);
    const ph = Math.ceil(canvas.height * pixelFactor);
    
    if (!state._studioPixelCanvas) {
       state._studioPixelCanvas = document.createElement('canvas');
    }
    const pc = state._studioPixelCanvas;
    if (pc.width !== pw || pc.height !== ph) {
      pc.width = pw;
      pc.height = ph;
    }
    const pctx = pc.getContext('2d');
    pctx.clearRect(0, 0, pw, ph);
    
    pctx.save();
    pctx.translate(pw / 2, heroY * pixelFactor);
    pctx.scale(currentScale * pixelFactor, currentScale * pixelFactor);
    drawWeaponPreview(pctx, activeWeaponKey, themeColor);
    pctx.restore();
    
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pc, 0, 0, pw, ph, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(canvas.width / 2, heroY);
    ctx.scale(currentScale, currentScale);
    drawWeaponPreview(ctx, activeWeaponKey, themeColor);
    ctx.restore();
  }

  // 5b. Zoom Controls (Below Preview)
  const zoomBarY = heroY + 155;
  const zoomBarCenterX = canvas.width / 2;

  // Zoom percentage label
  const zoomPct = Math.round((currentScale / ZOOM_DEFAULT) * 100);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`🔍 ${zoomPct}%`, zoomBarCenterX, zoomBarY - 10);

  // Zoom Out button
  drawButton('−', zoomBarCenterX - 52, zoomBarY + 3, () => {
    state.studioPreviewScale = Math.max(ZOOM_MIN, state.studioPreviewScale - ZOOM_STEP);
  }, 28, 18);

  // Zoom bar background track
  const trackW = 60;
  const trackH = 6;
  const trackX = zoomBarCenterX - trackW / 2;
  const trackY = zoomBarY - 1;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(trackX, trackY, trackW, trackH, 3);
  ctx.fill();

  // Zoom bar fill
  const zoomFrac = (currentScale - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN);
  const fillW = Math.max(4, zoomFrac * trackW);
  const barGrad = ctx.createLinearGradient(trackX, trackY, trackX + fillW, trackY);
  barGrad.addColorStop(0, 'rgba(0, 200, 255, 0.7)');
  barGrad.addColorStop(1, 'rgba(0, 255, 200, 0.9)');
  ctx.fillStyle = barGrad;
  ctx.beginPath();
  ctx.roundRect(trackX, trackY, fillW, trackH, 3);
  ctx.fill();

  // Zoom In button
  drawButton('+', zoomBarCenterX + 52, zoomBarY + 3, () => {
    state.studioPreviewScale = Math.min(ZOOM_MAX, state.studioPreviewScale + ZOOM_STEP);
  }, 28, 18);

  // Reset Zoom button (small)
  drawButton('⟲', zoomBarCenterX + 90, zoomBarY + 3, () => {
    state.studioPreviewScale = ZOOM_DEFAULT;
  }, 22, 18);

  // 6. Left Panel: Weapon Selection list
  const leftX = 18;
  const leftY = 85;
  const leftW = 145;
  const leftH = 215;
  drawPanel(leftX, leftY, leftW, leftH, 0.85, 8);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SELECT WEAPON', leftX + leftW / 2, leftY + 18);

  const weapons = [
    { key: 'mahito', label: 'MAHITO CLAWS' },
    { key: 'yuta', label: 'YUTA KATANA' },
    { key: 'toji', label: 'TOJI SPEAR' },
    { key: 'cronos', label: 'CRONOS BLADE' },
    { key: 'ruby', label: 'RUBY SCYTHE' },
    { key: 'nanami', label: 'NANAMI CLEAVER' },
    { key: 'john_wick', label: 'JOHN WICK PIT VIPER' }
  ];

  weapons.forEach((w, idx) => {
    const btnX = leftX + leftW / 2;
    const btnY = leftY + 38 + idx * 26;
    const isSelected = activeWeaponKey === w.key;

    const wBtn = 115;
    const hBtn = 20;
    const bx = btnX - wBtn / 2;
    const by = btnY - hBtn / 2;

    ctx.fillStyle = isSelected ? 'rgba(255, 215, 0, 0.22)' : 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = isSelected ? '#FFD700' : 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, wBtn, hBtn, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isSelected ? '#FFD700' : 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 9px Arial';
    ctx.fillText(w.label, btnX, btnY + 3);

    _registerButton(bx, by, wBtn, hBtn, () => {
      state.studioSelectedWeapon = w.key;
      state.studioSelectedDetail = null; // Hide handles until user clicks a detail
      isDraggingBase = false;
      isDraggingTip = false;
      activeDragFinger = -1;
      activeDragType = null;
    });
  });

  // 6b. Pixel Art Toggle
  if (state.studioPixelArtMode === undefined) state.studioPixelArtMode = false;
  
  const pxBtnY = leftY + leftH + 22;
  const pxBtnW = 125;
  const pxBtnH = 24;
  const pxBtnX = leftX + leftW / 2;
  
  ctx.fillStyle = state.studioPixelArtMode ? 'rgba(0, 255, 128, 0.15)' : 'rgba(255, 255, 255, 0.04)';
  ctx.strokeStyle = state.studioPixelArtMode ? '#00ff80' : 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(pxBtnX - pxBtnW / 2, pxBtnY - pxBtnH / 2, pxBtnW, pxBtnH, 4);
  ctx.fill();
  ctx.stroke();
  
  ctx.fillStyle = state.studioPixelArtMode ? '#00ff80' : 'rgba(255, 255, 255, 0.6)';
  ctx.font = 'bold 9px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(state.studioPixelArtMode ? '👾 PIXEL ART: ON' : '👾 PIXEL ART: OFF', pxBtnX, pxBtnY + 3);
  
  _registerButton(pxBtnX - pxBtnW / 2, pxBtnY - pxBtnH / 2, pxBtnW, pxBtnH, () => {
    state.studioPixelArtMode = !state.studioPixelArtMode;
  });

  // 7. Right Panel: Precise Curvature & Transform Controls
  const rightW = 145;
  const rightX = canvas.width - rightW - 18;
  const rightY = 85;
  const rightH = 255;
  drawPanel(rightX, rightY, rightW, rightH, 0.85, 8);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';

  if (activeWeaponKey === 'mahito') {
    ctx.fillText('CLAW FINGERS', rightX + rightW / 2, rightY + 18);
    if (state.studioClawFinger === undefined) state.studioClawFinger = 0;

    const drawOrder = state.weaponCustomizations.mahito.drawOrder;
    const clawNames = ['FINGER 1', 'FINGER 2', 'FINGER 3', 'THUMB'];
    clawNames.forEach((name, idx) => {
      const btnX = rightX + rightW / 2;
      const btnY = rightY + 32 + idx * 22;
      const isSelected = state.studioClawFinger === idx && state.studioSelectedDetail === 'finger';

      // Layer position: 0 = backmost, 3 = frontmost
      const layerPos = drawOrder.indexOf(idx);
      const layerLabel = layerPos === drawOrder.length - 1 ? 'FRONT' : layerPos === 0 ? 'BACK' : `L${layerPos + 1}`;

      const wBtn = 115;
      const hBtn = 17;
      const bx = btnX - wBtn / 2;
      const by = btnY - hBtn / 2;

      ctx.fillStyle = isSelected ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = isSelected ? '#00ffff' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, wBtn, hBtn, 3);
      ctx.fill();
      ctx.stroke();

      // Name label
      ctx.fillStyle = isSelected ? '#00ffff' : 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'bold 8px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(name, bx + 5, btnY + 3);

      // Layer badge
      const badgeColor = layerPos === drawOrder.length - 1 ? '#FFD700' : layerPos === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.55)';
      ctx.fillStyle = badgeColor;
      ctx.font = '7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(layerLabel, bx + wBtn - 38, btnY + 3);

      // ▲ Bring Forward button
      const upBtnX = bx + wBtn - 22;
      const upBtnY = by + 1;
      const arrowBtnW = 10;
      const arrowBtnH = hBtn - 2;
      const canMoveUp = layerPos < drawOrder.length - 1;

      ctx.fillStyle = canMoveUp ? 'rgba(0, 200, 100, 0.25)' : 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.roundRect(upBtnX, upBtnY, arrowBtnW, arrowBtnH, 2);
      ctx.fill();
      ctx.fillStyle = canMoveUp ? '#00ff88' : 'rgba(255,255,255,0.15)';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('▲', upBtnX + arrowBtnW / 2, upBtnY + arrowBtnH / 2 + 3);

      if (canMoveUp) {
        _registerButton(upBtnX, upBtnY, arrowBtnW, arrowBtnH, () => {
          const pos = drawOrder.indexOf(idx);
          if (pos < drawOrder.length - 1) {
            [drawOrder[pos], drawOrder[pos + 1]] = [drawOrder[pos + 1], drawOrder[pos]];
            saveWeaponCustomizations();
          }
        });
      }

      // ▼ Send Back button
      const downBtnX = bx + wBtn - 11;
      const downBtnY = by + 1;
      const canMoveDown = layerPos > 0;

      ctx.fillStyle = canMoveDown ? 'rgba(200, 100, 0, 0.25)' : 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      ctx.roundRect(downBtnX, downBtnY, arrowBtnW, arrowBtnH, 2);
      ctx.fill();
      ctx.fillStyle = canMoveDown ? '#ffaa00' : 'rgba(255,255,255,0.15)';
      ctx.font = 'bold 9px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('▼', downBtnX + arrowBtnW / 2, downBtnY + arrowBtnH / 2 + 3);

      if (canMoveDown) {
        _registerButton(downBtnX, downBtnY, arrowBtnW, arrowBtnH, () => {
          const pos = drawOrder.indexOf(idx);
          if (pos > 0) {
            [drawOrder[pos], drawOrder[pos - 1]] = [drawOrder[pos - 1], drawOrder[pos]];
            saveWeaponCustomizations();
          }
        });
      }

      // Main card click area (excluding arrow buttons)
      _registerButton(bx, by, wBtn - 24, hBtn, () => {
        state.studioClawFinger = idx;
        state.studioSelectedDetail = 'finger';
      });
    });

    const adjustY = rightY + 125;
    const f = state.weaponCustomizations.mahito.blades[state.studioClawFinger];

    if (state.studioSelectedDetail === 'finger') {
      // Arch
      ctx.fillStyle = '#ffffff';
      ctx.font = '9px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`Arch: ${Math.round(f.topArchY)}`, rightX + 15, adjustY + 20);
      drawButton('-', rightX + rightW - 50, adjustY + 20, () => { f.topArchY -= 1.0; saveWeaponCustomizations(); }, 16, 12);
      drawButton('+', rightX + rightW - 25, adjustY + 20, () => { f.topArchY += 1.0; saveWeaponCustomizations(); }, 16, 12);

      // Tip
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Tip: ${Math.round(f.tipY)}`, rightX + 15, adjustY + 40);
      drawButton('-', rightX + rightW - 50, adjustY + 40, () => { f.tipY -= 1.0; saveWeaponCustomizations(); }, 16, 12);
      drawButton('+', rightX + rightW - 25, adjustY + 40, () => { f.tipY += 1.0; saveWeaponCustomizations(); }, 16, 12);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'italic 8.5px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Click a finger card', rightX + rightW / 2, adjustY + 25);
      ctx.fillText('to edit curvature', rightX + rightW / 2, adjustY + 38);
    }

    // ── Weapon Scale Control (always visible for Mahito) ──
    const scaleY = adjustY + 58;
    const mahitoCustom = state.weaponCustomizations.mahito;
    ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('WEAPON SCALE', rightX + rightW / 2, scaleY);

    ctx.fillStyle = '#ffffff';
    ctx.font = '9px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Scale: ${mahitoCustom.weaponScale.toFixed(2)}x`, rightX + 15, scaleY + 16);
    drawButton('-', rightX + rightW - 50, scaleY + 16, () => { mahitoCustom.weaponScale = Math.max(0.3, mahitoCustom.weaponScale - 0.05); saveWeaponCustomizations(); }, 16, 12);
    drawButton('+', rightX + rightW - 25, scaleY + 16, () => { mahitoCustom.weaponScale = Math.min(3.0, mahitoCustom.weaponScale + 0.05); saveWeaponCustomizations(); }, 16, 12);
  } else {
    // Selectable Details List
    ctx.fillText('ADJUSTABLE DETAILS', rightX + rightW / 2, rightY + 18);
    
    const detailOptions = [
      { id: 'position', label: '📍 POSITION (X, Y)' },
      { id: 'scale_angle', label: '📐 SCALE & ANGLE' }
    ];
    
    detailOptions.forEach((opt, idx) => {
      const btnX = rightX + rightW / 2;
      const btnY = rightY + 34 + idx * 22;
      const isSelected = state.studioSelectedDetail === opt.id;
      
      const wBtn = 120;
      const hBtn = 18;
      const bx = btnX - wBtn / 2;
      const by = btnY - hBtn / 2;
      
      ctx.fillStyle = isSelected ? 'rgba(0, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)';
      ctx.strokeStyle = isSelected ? '#00ffff' : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, wBtn, hBtn, 3);
      ctx.fill();
      ctx.stroke();
      
      ctx.fillStyle = isSelected ? '#00ffff' : 'rgba(255, 255, 255, 0.7)';
      ctx.font = 'bold 8.5px Arial';
      ctx.fillText(opt.label, btnX, btnY + 4.5);
      
      _registerButton(bx, by, wBtn, hBtn, () => {
        state.studioSelectedDetail = opt.id;
      });
    });

    const controlY = rightY + 98;
    const custom = state.weaponCustomizations[activeWeaponKey];
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px Arial';
    ctx.textAlign = 'left';

    if (state.studioSelectedDetail === 'position') {
      // Offset X
      ctx.fillText(`Offset X: ${Math.round(custom.offsetX)}`, rightX + 15, controlY);
      drawButton('-', rightX + rightW - 50, controlY, () => { custom.offsetX -= 2.0; saveWeaponCustomizations(); }, 16, 12);
      drawButton('+', rightX + rightW - 25, controlY, () => { custom.offsetX += 2.0; saveWeaponCustomizations(); }, 16, 12);

      // Offset Y
      ctx.fillText(`Offset Y: ${Math.round(custom.offsetY)}`, rightX + 15, controlY + 26);
      drawButton('-', rightX + rightW - 50, controlY + 26, () => { custom.offsetY -= 2.0; saveWeaponCustomizations(); }, 16, 12);
      drawButton('+', rightX + rightW - 25, controlY + 26, () => { custom.offsetY += 2.0; saveWeaponCustomizations(); }, 16, 12);
    } else if (state.studioSelectedDetail === 'scale_angle') {
      // Scale
      ctx.fillText(`Scale: ${custom.scale.toFixed(2)}x`, rightX + 15, controlY);
      drawButton('-', rightX + rightW - 50, controlY, () => { custom.scale = Math.max(0.3, custom.scale - 0.05); saveWeaponCustomizations(); }, 16, 12);
      drawButton('+', rightX + rightW - 25, controlY, () => { custom.scale = Math.min(3.0, custom.scale + 0.05); saveWeaponCustomizations(); }, 16, 12);

      // Angle Offset
      const deg = Math.round((custom.angleOffset * 180) / Math.PI);
      ctx.fillText(`Angle: ${deg}°`, rightX + 15, controlY + 26);
      drawButton('-', rightX + rightW - 50, controlY + 26, () => { custom.angleOffset -= 0.08; saveWeaponCustomizations(); }, 16, 12);
      drawButton('+', rightX + rightW - 25, controlY + 26, () => { custom.angleOffset += 0.08; saveWeaponCustomizations(); }, 16, 12);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.font = 'italic 8.5px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Click details card above', rightX + rightW / 2, controlY + 12);
      ctx.fillText('to enable handles', rightX + rightW / 2, controlY + 25);
    }
  }

  // 8. Bottom Center: Reset & Lock buttons
  const ctrlBtnY = canvas.height - 180;
  drawButton('🔄 RESET TO DEFAULT', canvas.width / 2, ctrlBtnY, () => {
    if (confirm('Reset current weapon customization?')) {
      if (activeWeaponKey === 'mahito') {
        state.weaponCustomizations.mahito.blades = [
          { idx: 0, knuckleX: 3.0, knuckleY: -6.5, fanAngle: -0.32, length: 82, heelWidth: 14.0, topArchY: -14.0, tipY: 16.0 },
          { idx: 1, knuckleX: 5.0, knuckleY: -3.8, fanAngle: -0.22, length: 88, heelWidth: 15.5, topArchY: -9.0, tipY: 18.0 },
          { idx: 2, knuckleX: 6.0, knuckleY: -0.8, fanAngle: -0.06, length: 84, heelWidth: 15.0, topArchY: -3.0, tipY: 24.0 },
          { idx: 3, knuckleX: 1.5, knuckleY: 9.0, fanAngle: 0.48, length: 80, heelWidth: 14.5, topArchY: 18.0, tipY: -22.0 }
        ];
        state.weaponCustomizations.mahito.drawOrder = [0, 1, 2, 3];
        state.weaponCustomizations.mahito.weaponScale = 1.0;
        state.mahitoClawCustomBlades = state.weaponCustomizations.mahito.blades;
      } else {
        const custom = state.weaponCustomizations[activeWeaponKey];
        custom.offsetX = 0;
        custom.offsetY = 0;
        custom.scale = 1.0;
        custom.angleOffset = 0;
      }
      saveWeaponCustomizations();
    }
  }, 160, 24);

  // 9. Back Button
  drawButton('⌂ BACK TO MENU', canvas.width / 2, canvas.height - 40, () => {
    state.gameState = 'title';
  }, 160, 32);

  // 10. Draw Canvas Interactive Drag Handles (Conditional visibility based on selection)
  if (state.studioSelectedDetail !== null) {
    ctx.save();
    ctx.translate(canvas.width / 2, heroY);
    ctx.scale(currentScale, currentScale);

    if (activeWeaponKey === 'mahito' && state.studioSelectedDetail === 'finger') {
      // Claw finger handles (knuckles & tips) - Render ONLY for the selected finger
      const handX = 25;
      const blades = state.weaponCustomizations.mahito.blades;
      const b = blades[state.studioClawFinger];
      if (b) {
        const kx = handX + b.knuckleX;
        const ky = b.knuckleY;

        const cosAngle = Math.cos(b.fanAngle);
        const sinAngle = Math.sin(b.fanAngle);
        const tx = handX + b.knuckleX + b.length * cosAngle - b.tipY * sinAngle;
        const ty = b.knuckleY + b.length * sinAngle + b.tipY * cosAngle;

        // Knuckle (Teal handle)
        ctx.beginPath(); ctx.arc(kx, ky, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = (activeDragFinger === state.studioClawFinger && activeDragType === 'knuckle') ? '#00ffff' : 'rgba(0, 255, 255, 0.75)';
        ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.stroke();

        // Tip (Crimson handle)
        ctx.beginPath(); ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = (activeDragFinger === state.studioClawFinger && activeDragType === 'tip') ? '#ff3333' : 'rgba(255, 50, 50, 0.75)';
        ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.stroke();

        // Guideline
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(tx, ty);
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 0.5; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
      }
    } else if (activeWeaponKey !== 'mahito') {
      // Generic transforms handles for single-blade weapons
      const custom = state.weaponCustomizations[activeWeaponKey];
      
      let offsetX = -40;
      if (activeWeaponKey === 'cronos') offsetX = -55;
      else if (activeWeaponKey === 'ruby') offsetX = -75;

      const baseLx = offsetX + custom.offsetX;
      const baseLy = custom.offsetY;

      if (state.studioSelectedDetail === 'position') {
        // Grip Anchor (Teal handle) - Position adjust only
        ctx.beginPath(); ctx.arc(baseLx, baseLy, 4.0, 0, Math.PI * 2);
        ctx.fillStyle = isDraggingBase ? '#00ffff' : 'rgba(0, 255, 255, 0.85)';
        ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.stroke();
      } else if (state.studioSelectedDetail === 'scale_angle') {
        // Scale / Angle Handle (Crimson handle) - Angle/Scale adjust only
        const lineLen = 70;
        const tipLx = baseLx + lineLen * custom.scale * Math.cos(custom.angleOffset);
        const tipLy = baseLy + lineLen * custom.scale * Math.sin(custom.angleOffset);

        ctx.beginPath(); ctx.arc(tipLx, tipLy, 4.0, 0, Math.PI * 2);
        ctx.fillStyle = isDraggingTip ? '#ff3333' : 'rgba(255, 50, 50, 0.85)';
        ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.stroke();

        // Connection bone line from grip anchor to tip
        ctx.beginPath(); ctx.moveTo(baseLx, baseLy); ctx.lineTo(tipLx, tipLy);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 0.6; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }
}

// ─────────────────────────────────────────────
// mouse down, move, up event listeners
// ─────────────────────────────────────────────
if (typeof window !== 'undefined') {
  const eventTarget = state.pixiApp ? state.pixiApp.view : state.canvas;

  eventTarget.addEventListener('mousedown', (e) => {
    if (state.gameState !== 'weaponStudio' || state.studioSelectedDetail === null) return;

    const rect = eventTarget.getBoundingClientRect();
    const scaleX = state.canvas.width / rect.width;
    const scaleY = state.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const currentScale = state.studioPreviewScale;
    const heroY = state.canvas.height * 0.35;
    const activeWeaponKey = state.studioSelectedWeapon;

    // Convert mouse position to local hero display space
    const localX = (mx - state.canvas.width / 2) / currentScale;
    const localY = (my - heroY) / currentScale;

    if (activeWeaponKey === 'mahito') {
      if (state.studioSelectedDetail !== 'finger') return;
      const handX = 25;
      const blades = state.weaponCustomizations.mahito.blades;
      const i = state.studioClawFinger;
      const b = blades[i];
      if (!b) return;

      const kx = handX + b.knuckleX;
      const ky = b.knuckleY;

      const cosAngle = Math.cos(b.fanAngle);
      const sinAngle = Math.sin(b.fanAngle);
      const tx = handX + b.knuckleX + b.length * cosAngle - b.tipY * sinAngle;
      const ty = b.knuckleY + b.length * sinAngle + b.tipY * cosAngle;

      // Knuckle click check
      if (Math.hypot(localX - kx, localY - ky) < 10) {
        activeDragFinger = i;
        activeDragType = 'knuckle';
        return;
      }

      // Tip click check
      if (Math.hypot(localX - tx, localY - ty) < 10) {
        activeDragFinger = i;
        activeDragType = 'tip';
        return;
      }
    } else {
      const custom = state.weaponCustomizations[activeWeaponKey];
      let offsetX = -40;
      if (activeWeaponKey === 'cronos') offsetX = -55;
      else if (activeWeaponKey === 'ruby') offsetX = -75;

      const baseLx = offsetX + custom.offsetX;
      const baseLy = custom.offsetY;

      if (state.studioSelectedDetail === 'position') {
        // Grip anchor check
        if (Math.hypot(localX - baseLx, localY - baseLy) < 10) {
          isDraggingBase = true;
          return;
        }
      } else if (state.studioSelectedDetail === 'scale_angle') {
        const lineLen = 70;
        const tipLx = baseLx + lineLen * custom.scale * Math.cos(custom.angleOffset);
        const tipLy = baseLy + lineLen * custom.scale * Math.sin(custom.angleOffset);

        // Tip handle check
        if (Math.hypot(localX - tipLx, localY - tipLy) < 10) {
          isDraggingTip = true;
          return;
        }
      }
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (state.gameState !== 'weaponStudio' || state.studioSelectedDetail === null) return;

    const rect = eventTarget.getBoundingClientRect();
    const scaleX = state.canvas.width / rect.width;
    const scaleY = state.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const currentScale = state.studioPreviewScale;
    const heroY = state.canvas.height * 0.35;
    const activeWeaponKey = state.studioSelectedWeapon;

    const localX = (mx - state.canvas.width / 2) / currentScale;
    const localY = (my - heroY) / currentScale;

    if (activeWeaponKey === 'mahito') {
      if (activeDragFinger < 0 || state.studioSelectedDetail !== 'finger') return;
      const handX = 25;
      const b = state.weaponCustomizations.mahito.blades[activeDragFinger];

      if (activeDragType === 'knuckle') {
        b.knuckleX = localX - handX;
        b.knuckleY = localY;
      } else if (activeDragType === 'tip') {
        const dx = localX - (handX + b.knuckleX);
        const dy = localY - b.knuckleY;
        b.length = Math.max(15, Math.hypot(dx, dy));
        b.fanAngle = Math.atan2(dy, dx);
      }
    } else {
      const custom = state.weaponCustomizations[activeWeaponKey];
      let offsetX = -40;
      if (activeWeaponKey === 'cronos') offsetX = -55;
      else if (activeWeaponKey === 'ruby') offsetX = -75;

      if (isDraggingBase && state.studioSelectedDetail === 'position') {
        custom.offsetX = localX - offsetX;
        custom.offsetY = localY;
      } else if (isDraggingTip && state.studioSelectedDetail === 'scale_angle') {
        const dx = localX - (offsetX + custom.offsetX);
        const dy = localY - custom.offsetY;
        const lineLen = 70;
        custom.scale = Math.max(0.3, Math.hypot(dx, dy) / lineLen);
        custom.angleOffset = Math.atan2(dy, dx);
      }
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDraggingBase || isDraggingTip || activeDragFinger >= 0) {
      saveWeaponCustomizations();
    }
    isDraggingBase = false;
    isDraggingTip = false;
    activeDragFinger = -1;
    activeDragType = null;
  });

  // Mouse Wheel Zoom
  eventTarget.addEventListener('wheel', (e) => {
    if (state.gameState !== 'weaponStudio') return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP * 0.5 : ZOOM_STEP * 0.5;
    state.studioPreviewScale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, state.studioPreviewScale + delta));
  }, { passive: false });
}
