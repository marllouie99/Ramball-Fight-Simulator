import { state, saveWeaponCustomizations } from '../../core/state.js';
import { FIGHTER_DEFS, CONFIG } from '../../core/config.js';
import { _clearButtons, _registerButton, handleUIMove, handleUIClick, drawPanel, drawButton, wrapText, drawChamferedRect } from './uiFramework.js';
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
if (state.studioZenitsuPart === undefined) state.studioZenitsuPart = 'overall';

// Precision Viewport Layout Constants (Unified for rendering and mouse math)
const VIEWPORT_X = 16;
const VIEWPORT_Y = 168;
const VIEWPORT_H = 346;

// Interactive Drag States
let isDraggingBase = false;
let isDraggingTip = false;
let activeDragFinger = -1;
let activeDragType = null; // 'knuckle' | 'tip'

// Cached Event Target Bounding Rect to eliminate DOM reflows / layout thrashing on mousemove
let _cachedStudioTargetRect = null;
function getCachedTargetRect(target) {
  if (!_cachedStudioTargetRect) {
    _cachedStudioTargetRect = target.getBoundingClientRect();
  }
  return _cachedStudioTargetRect;
}
function invalidateCachedTargetRect() {
  _cachedStudioTargetRect = null;
}

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
      rubbick: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
      uryu: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
      ulquiorra: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
      nanami: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
      megumi: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
      john_wick: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
      escanor: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
      engineer: { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 },
      zenitsu: {
        offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0, widthScale: 1.0, lengthScale: 1.0,
        parts: {
          blade:  { offsetX: 0, offsetY: 0, scale: 1.0, widthScale: 1.0, lengthScale: 1.0, angleOffset: 0 },
          tsuba:  { offsetX: 0, offsetY: 0, scale: 1.0, widthScale: 1.0, lengthScale: 1.0, angleOffset: 0 },
          habaki: { offsetX: 0, offsetY: 0, scale: 1.0, widthScale: 1.0, lengthScale: 1.0, angleOffset: 0 },
          handle: { offsetX: 0, offsetY: 0, scale: 1.0, widthScale: 1.0, lengthScale: 1.0, angleOffset: 0 },
          hands:  { offsetX: 0, offsetY: 0, scale: 1.0, spacing: 1.0 }
        }
      }
    };
    // Sync state.mahitoClawCustomBlades with the new unified structure
    state.mahitoClawCustomBlades = state.weaponCustomizations.mahito.blades;
  }
  if (!state.weaponCustomizations.rubbick) {
    state.weaponCustomizations.rubbick = { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };
  }
  if (!state.weaponCustomizations.ulquiorra) {
    state.weaponCustomizations.ulquiorra = { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };
  }
  if (!state.weaponCustomizations.megumi) {
    state.weaponCustomizations.megumi = { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };
  }
  if (!state.weaponCustomizations.uryu) {
    state.weaponCustomizations.uryu = { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };
  }
  if (!state.weaponCustomizations.cj) {
    state.weaponCustomizations.cj = { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };
  }
  if (!state.weaponCustomizations.escanor) {
    state.weaponCustomizations.escanor = { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };
  }
  if (!state.weaponCustomizations.engineer) {
    state.weaponCustomizations.engineer = { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };
  }
  if (!state.weaponCustomizations.zenitsu) {
    state.weaponCustomizations.zenitsu = {
      offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0, widthScale: 1.0, lengthScale: 1.0,
      parts: {
        blade:  { offsetX: 0, offsetY: 0, scale: 1.0, widthScale: 1.0, lengthScale: 1.0, angleOffset: 0 },
        tsuba:  { offsetX: 0, offsetY: 0, scale: 1.0, widthScale: 1.0, lengthScale: 1.0, angleOffset: 0 },
        habaki: { offsetX: 0, offsetY: 0, scale: 1.0, widthScale: 1.0, lengthScale: 1.0, angleOffset: 0 },
        handle: { offsetX: 0, offsetY: 0, scale: 1.0, widthScale: 1.0, lengthScale: 1.0, angleOffset: 0 },
        hands:  { offsetX: 0, offsetY: 0, scale: 1.0, spacing: 1.0 }
      }
    };
  } else {
    if (!state.weaponCustomizations.zenitsu.parts) {
      state.weaponCustomizations.zenitsu.parts = {};
    }
    const p = state.weaponCustomizations.zenitsu.parts;
    ['blade', 'tsuba', 'habaki', 'handle'].forEach(k => {
      if (!p[k]) p[k] = { offsetX: 0, offsetY: 0, scale: 1.0, widthScale: 1.0, lengthScale: 1.0, angleOffset: 0 };
      if (p[k].widthScale === undefined) p[k].widthScale = 1.0;
      if (p[k].lengthScale === undefined) p[k].lengthScale = 1.0;
    });
    if (!p.hands) p.hands = { offsetX: 0, offsetY: 0, scale: 1.0, spacing: 1.0 };
  }
  if (!state.weaponCustomizations.mahito.drawOrder) {
    state.weaponCustomizations.mahito.drawOrder = [0, 1, 2, 3];
  }
  if (state.weaponCustomizations.mahito.weaponScale === undefined) {
    state.weaponCustomizations.mahito.weaponScale = 1.0;
  }
  
  // Migration for widthScale and lengthScale
  Object.keys(state.weaponCustomizations).forEach(k => {
    if (k !== 'mahito' && state.weaponCustomizations[k]) {
      if (state.weaponCustomizations[k].widthScale === undefined) state.weaponCustomizations[k].widthScale = 1.0;
      if (state.weaponCustomizations[k].lengthScale === undefined) state.weaponCustomizations[k].lengthScale = 1.0;
    }
  });
}

export function drawWeaponStudioScreen() {
  const { ctx, canvas } = state;
  initCustomizations();

  // 1. Reset Context
  ctx.resetTransform();
  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0;

  _clearButtons();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2. Sleek Gunmetal Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, '#07080c');
  bgGrad.addColorStop(0.5, '#10131c');
  bgGrad.addColorStop(1, '#07080c');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const activeWeaponKey = state.studioSelectedWeapon;
  const activeDef = FIGHTER_DEFS.find(f => f.type === activeWeaponKey || (f.type && f.type.toLowerCase() === activeWeaponKey.toLowerCase()));
  const themeColor = activeDef?.color || '#f59e0b';

  // ── Tier 1: Header Section ──
  ctx.fillStyle = '#64748b';
  ctx.font = '900 10px "Rajdhani", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('CIRCLE BATTLE // WEAPON STUDIO // SYS.v2.5', canvas.width / 2, 56);

  ctx.save();
  ctx.fillStyle = '#f8fafc';
  ctx.font = '900 20px "Outfit", "Rajdhani", sans-serif';
  ctx.fillText('[ WEAPON STUDIO ]', canvas.width / 2, 74);
  ctx.restore();

  // Weapon Selector Chips (2 Rows of Clean Chamfered Tabs)
  const weapons = [
    { key: 'mahito', label: 'MAHITO' },
    { key: 'yuta', label: 'YUTA' },
    { key: 'toji', label: 'TOJI' },
    { key: 'cronos', label: 'CRONOS' },
    { key: 'ruby', label: 'RUBY' },
    { key: 'rubbick', label: 'RUBBICK' },
    { key: 'uryu', label: 'URYU' },
    { key: 'ulquiorra', label: 'ULQUIORRA' },
    { key: 'nanami', label: 'NANAMI' },
    { key: 'megumi', label: 'MEGUMI' },
    { key: 'john_wick', label: 'JOHN WICK' },
    { key: 'cj', label: 'CJ' },
    { key: 'escanor', label: 'ESCANOR' },
    { key: 'zenitsu', label: 'ZENITSU' },
    { key: 'engineer', label: 'ENGINEER' }
  ];

  // Distribute across 3 rows for better spacing (5, 5, 5)
  const row1 = weapons.slice(0, 5);
  const row2 = weapons.slice(5, 10);
  const row3 = weapons.slice(10, 15);

  const rW = 80;
  const rH = 22;
  const rSpacing = 5;

  const renderRow = (row, startY) => {
    const rTotalW = row.length * rW + (row.length - 1) * rSpacing;
    let rStartX = (canvas.width - rTotalW) / 2;

    row.forEach((w) => {
      const isSelected = activeWeaponKey === w.key;
      ctx.save();
      if (isSelected) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.2;
      } else {
        ctx.fillStyle = 'rgba(16, 20, 28, 0.90)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
      }
      drawChamferedRect(ctx, rStartX, startY, rW, rH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = isSelected ? '#f8fafc' : '#64748b';
      ctx.font = '900 9.5px "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(w.label, rStartX + rW / 2, startY + rH / 2);

      _registerButton(rStartX, startY, rW, rH, () => {
        state.studioSelectedWeapon = w.key;
        state.studioSelectedDetail = null;
        isDraggingBase = false;
        isDraggingTip = false;
        activeDragFinger = -1;
        activeDragType = null;
      });
      rStartX += rW + rSpacing;
    });
  };

  renderRow(row1, 88);
  renderRow(row2, 114);
  renderRow(row3, 140);

  // ── Tier 2: Precision Viewport Stage ──
  const viewportX = VIEWPORT_X;
  const viewportY = VIEWPORT_Y;
  const viewportW = canvas.width - 32; // 508px
  const viewportH = VIEWPORT_H;
  const heroX = canvas.width / 2;
  const heroY = viewportY + viewportH / 2;

  // Viewport Container Panel
  drawPanel(viewportX, viewportY, viewportW, viewportH, 0.94, 8);

  // Background inside Viewport (Plain White Review Canvas)
  ctx.save();
  ctx.beginPath();
  drawChamferedRect(ctx, viewportX + 1, viewportY + 1, viewportW - 2, viewportH - 2, 7);
  ctx.clip();

  // Plain White Background Fill
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(viewportX, viewportY, viewportW, viewportH);

  // Render Hero Weapon Preview
  const currentScale = state.studioPreviewScale;
  if (state.studioPixelArtMode) {
    const pixelFactor = 0.30;
    const pw = Math.ceil(viewportW * pixelFactor);
    const ph = Math.ceil(viewportH * pixelFactor);

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
    pctx.translate(pw / 2, ph / 2);
    pctx.scale(currentScale * pixelFactor, currentScale * pixelFactor);
    drawWeaponPreview(pctx, activeWeaponKey, themeColor);
    pctx.restore();

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pc, 0, 0, pw, ph, viewportX, viewportY, viewportW, viewportH);
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(heroX, heroY);
    ctx.scale(currentScale, currentScale);
    drawWeaponPreview(ctx, activeWeaponKey, themeColor);
    ctx.restore();
  }

  // Draw Interactive Drag Handles
  if (state.studioSelectedDetail !== null) {
    ctx.save();
    ctx.translate(heroX, heroY);
    ctx.scale(currentScale, currentScale);

    if (activeWeaponKey === 'mahito' && state.studioSelectedDetail === 'finger') {
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

        // Knuckle Handle (Teal)
        ctx.beginPath(); ctx.arc(kx, ky, 4.0, 0, Math.PI * 2);
        ctx.fillStyle = (activeDragFinger === state.studioClawFinger && activeDragType === 'knuckle') ? '#00ffff' : 'rgba(0, 255, 255, 0.85)';
        ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.0; ctx.stroke();

        // Tip Handle (Amber / Red)
        ctx.beginPath(); ctx.arc(tx, ty, 4.0, 0, Math.PI * 2);
        ctx.fillStyle = (activeDragFinger === state.studioClawFinger && activeDragType === 'tip') ? '#f59e0b' : 'rgba(245, 158, 11, 0.85)';
        ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.0; ctx.stroke();

        // Guide line
        ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(tx, ty);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
      }
    } else if (activeWeaponKey === 'zenitsu') {
      const custom = state.weaponCustomizations.zenitsu;
      const partKey = state.studioZenitsuPart || 'overall';
      const target = (partKey === 'overall')
        ? custom
        : ((custom.parts && custom.parts[partKey]) ? custom.parts[partKey] : custom);

      const baseLx = -64 + custom.offsetX + (partKey !== 'overall' ? (target.offsetX || 0) : 0);
      const baseLy = custom.offsetY + (partKey !== 'overall' ? (target.offsetY || 0) : 0);

      if (state.studioSelectedDetail === 'position') {
        ctx.beginPath(); ctx.arc(baseLx, baseLy, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = isDraggingBase ? '#00ffff' : 'rgba(0, 255, 255, 0.85)';
        ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.0; ctx.stroke();
      } else if (state.studioSelectedDetail === 'scale_angle' || state.studioSelectedDetail === 'hands_size') {
        const lineLen = 70;
        const curScale = target.scale ?? 1.0;
        const curAngle = target.angleOffset ?? 0;
        const tipLx = baseLx + lineLen * curScale * Math.cos(curAngle);
        const tipLy = baseLy + lineLen * curScale * Math.sin(curAngle);

        ctx.beginPath(); ctx.arc(tipLx, tipLy, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = isDraggingTip ? '#f59e0b' : 'rgba(245, 158, 11, 0.85)';
        ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.0; ctx.stroke();

        ctx.beginPath(); ctx.moveTo(baseLx, baseLy); ctx.lineTo(tipLx, tipLy);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
      }
    } else if (activeWeaponKey !== 'mahito') {
      const custom = state.weaponCustomizations[activeWeaponKey];
      let offsetX = -40;
      if (activeWeaponKey === 'cronos') offsetX = -55;
      else if (activeWeaponKey === 'ruby') offsetX = -75;
      else if (activeWeaponKey === 'rubbick' || activeWeaponKey === 'uryu') offsetX = 0;

      const baseLx = offsetX + custom.offsetX;
      const baseLy = custom.offsetY;

      if (state.studioSelectedDetail === 'position') {
        ctx.beginPath(); ctx.arc(baseLx, baseLy, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = isDraggingBase ? '#00ffff' : 'rgba(0, 255, 255, 0.85)';
        ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.0; ctx.stroke();
      } else if (state.studioSelectedDetail === 'scale_angle') {
        const lineLen = 70;
        const tipLx = baseLx + lineLen * custom.scale * Math.cos(custom.angleOffset);
        const tipLy = baseLy + lineLen * custom.scale * Math.sin(custom.angleOffset);

        ctx.beginPath(); ctx.arc(tipLx, tipLy, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = isDraggingTip ? '#f59e0b' : 'rgba(245, 158, 11, 0.85)';
        ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.0; ctx.stroke();

        ctx.beginPath(); ctx.moveTo(baseLx, baseLy); ctx.lineTo(tipLx, tipLy);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; ctx.lineWidth = 0.8; ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  ctx.restore(); // Restore clip

  // Viewport Overlays: Pixel Art toggle (Top Left)
  if (state.studioPixelArtMode === undefined) state.studioPixelArtMode = false;
  const pxBtnX = viewportX + 10;
  const pxBtnY = viewportY + 10;
  const pxBtnW = 105;
  const pxBtnH = 22;

  ctx.save();
  ctx.fillStyle = state.studioPixelArtMode ? 'rgba(245, 158, 11, 0.22)' : 'rgba(18, 22, 32, 0.9)';
  ctx.strokeStyle = state.studioPixelArtMode ? '#f59e0b' : 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, pxBtnX, pxBtnY, pxBtnW, pxBtnH, 4);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = state.studioPixelArtMode ? '#f59e0b' : '#94a3b8';
  ctx.font = '900 9px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.studioPixelArtMode ? 'PIXEL ART: ON' : 'PIXEL ART: OFF', pxBtnX + pxBtnW / 2, pxBtnY + pxBtnH / 2);

  _registerButton(pxBtnX, pxBtnY, pxBtnW, pxBtnH, () => {
    state.studioPixelArtMode = !state.studioPixelArtMode;
  });

  // Viewport Overlays: Zoom Controls Bar (Bottom of Viewport)
  const zoomY = viewportY + viewportH - 24;
  const zoomCenterX = heroX;
  const zoomPct = Math.round((currentScale / ZOOM_DEFAULT) * 100);

  drawButton('−', zoomCenterX - 85, zoomY, () => {
    state.studioPreviewScale = Math.max(ZOOM_MIN, state.studioPreviewScale - ZOOM_STEP);
  }, 26, 18, null, 3);

  // Zoom Bar track
  const trackW = 90;
  const trackH = 6;
  const trackX = zoomCenterX - trackW / 2;
  const trackY = zoomY - 3;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, trackX, trackY, trackW, trackH, 2);
  ctx.fill();
  ctx.stroke();

  const zoomFrac = (currentScale - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN);
  const fillW = Math.max(4, zoomFrac * trackW);
  ctx.fillStyle = '#f59e0b';
  drawChamferedRect(ctx, trackX, trackY, fillW, trackH, 2);
  ctx.fill();

  drawButton('+', zoomCenterX + 85, zoomY, () => {
    state.studioPreviewScale = Math.min(ZOOM_MAX, state.studioPreviewScale + ZOOM_STEP);
  }, 26, 18, null, 3);

  drawButton('⟲', zoomCenterX + 120, zoomY, () => {
    state.studioPreviewScale = ZOOM_DEFAULT;
  }, 22, 18, null, 3);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 9.5px "Rajdhani", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`ZOOM: ${zoomPct}%`, zoomCenterX, zoomY - 7);

  // ── Tier 3: Dual Parameter Console ──
  const consoleY = viewportY + viewportH + 10; // 524
  const consoleH = 320;
  const consoleGap = 12;
  const leftConsoleW = Math.floor((viewportW - consoleGap) * 0.48); // 238px
  const rightConsoleW = viewportW - leftConsoleW - consoleGap; // 258px
  const leftConsoleX = viewportX;
  const rightConsoleX = leftConsoleX + leftConsoleW + consoleGap;

  // Left Console Panel (Layers & Components)
  drawPanel(leftConsoleX, consoleY, leftConsoleW, consoleH, 0.92, 8);
  // Right Console Panel (Precision Metrics)
  drawPanel(rightConsoleX, consoleY, rightConsoleW, consoleH, 0.92, 8);

  // Console Headers
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 10px "Rajdhani", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  if (activeWeaponKey === 'mahito') {
    ctx.fillText('CLAW BLADE LAYERS //', leftConsoleX + 14, consoleY + 12);
    ctx.fillText('GEOMETRY CALIBRATION //', rightConsoleX + 14, consoleY + 12);

    if (state.studioClawFinger === undefined) state.studioClawFinger = 0;
    const drawOrder = state.weaponCustomizations.mahito.drawOrder;
    const clawNames = ['FINGER 1 (TOP)', 'FINGER 2 (MID-TOP)', 'FINGER 3 (MID-BOT)', 'THUMB (BOTTOM)'];

    // Finger Layer Cards in Left Console
    clawNames.forEach((name, idx) => {
      const cardY = consoleY + 34 + idx * 48;
      const cardW = leftConsoleW - 24;
      const cardH = 40;
      const cardX = leftConsoleX + 12;
      const isSelected = state.studioClawFinger === idx && state.studioSelectedDetail === 'finger';

      const layerPos = drawOrder.indexOf(idx);
      const layerLabel = layerPos === drawOrder.length - 1 ? 'TOP' : layerPos === 0 ? 'BOTTOM' : `LAYER ${layerPos + 1}`;

      ctx.save();
      if (isSelected) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.20)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
      } else {
        ctx.fillStyle = 'rgba(18, 22, 32, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.lineWidth = 1;
      }
      drawChamferedRect(ctx, cardX, cardY, cardW, cardH, 5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
      ctx.font = '900 10px "Rajdhani", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(name, cardX + 10, cardY + 8);

      ctx.fillStyle = isSelected ? '#f59e0b' : '#64748b';
      ctx.font = '900 8.5px "Rajdhani", monospace';
      ctx.fillText(`ORDER: [ ${layerLabel} ]`, cardX + 10, cardY + 23);

      // Layer Up (▲) / Down (▼) buttons
      const upBtnX = cardX + cardW - 48;
      const downBtnX = cardX + cardW - 24;
      const btnSize = 18;
      const btnY = cardY + 11;

      drawButton('▲', upBtnX, btnY + btnSize / 2, () => {
        const pos = drawOrder.indexOf(idx);
        if (pos < drawOrder.length - 1) {
          [drawOrder[pos], drawOrder[pos + 1]] = [drawOrder[pos + 1], drawOrder[pos]];
          saveWeaponCustomizations();
        }
      }, btnSize, btnSize, null, 2);

      drawButton('▼', downBtnX, btnY + btnSize / 2, () => {
        const pos = drawOrder.indexOf(idx);
        if (pos > 0) {
          [drawOrder[pos], drawOrder[pos - 1]] = [drawOrder[pos - 1], drawOrder[pos]];
          saveWeaponCustomizations();
        }
      }, btnSize, btnSize, null, 2);

      _registerButton(cardX, cardY, cardW - 52, cardH, () => {
        state.studioClawFinger = idx;
        state.studioSelectedDetail = 'finger';
      });
    });

    // Right Console Metrics for Mahito
    const f = state.weaponCustomizations.mahito.blades[state.studioClawFinger];
    let curY = consoleY + 34;

    if (state.studioSelectedDetail === 'finger') {
      ctx.fillStyle = '#64748b';
      ctx.font = '900 9px "Rajdhani", sans-serif';
      ctx.fillText(`ACTIVE: ${clawNames[state.studioClawFinger]}`, rightConsoleX + 14, curY);
      curY += 22;

      // Arch Stepper
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11px "Rajdhani", sans-serif';
      ctx.fillText(`SPINE ARCH: ${Math.round(f.topArchY)}px`, rightConsoleX + 14, curY + 4);
      drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { f.topArchY -= 1.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
      drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { f.topArchY += 1.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
      curY += 34;

      // Tip Stepper
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`TIP CURVATURE: ${Math.round(f.tipY)}px`, rightConsoleX + 14, curY + 4);
      drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { f.tipY -= 1.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
      drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { f.tipY += 1.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
      curY += 34;

      // Blade Length Readout
      ctx.fillStyle = '#94a3b8';
      ctx.font = '900 10px "Rajdhani", monospace';
      ctx.fillText(`BLADE LENGTH: ${Math.round(f.length)}px`, rightConsoleX + 14, curY);
      curY += 20;
      ctx.fillText(`FAN ANGLE: ${(f.fanAngle * (180 / Math.PI)).toFixed(1)}°`, rightConsoleX + 14, curY);
      curY += 32;
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '900 10px "Rajdhani", sans-serif';
      ctx.fillText('SELECT A FINGER CARD ON THE LEFT', rightConsoleX + 14, curY + 20);
      ctx.fillText('TO ADJUST BLADE CURVATURE', rightConsoleX + 14, curY + 36);
      curY += 80;
    }

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rightConsoleX + 14, curY);
    ctx.lineTo(rightConsoleX + rightConsoleW - 14, curY);
    ctx.stroke();
    curY += 16;

    // Global Weapon Scale
    const mahitoCustom = state.weaponCustomizations.mahito;
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 10.5px "Rajdhani", sans-serif';
    ctx.fillText('GLOBAL CLAW SCALE //', rightConsoleX + 14, curY);
    curY += 20;

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 12px "Rajdhani", sans-serif';
    ctx.fillText(`SCALE: ${mahitoCustom.weaponScale.toFixed(2)}x`, rightConsoleX + 14, curY + 4);
    drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { mahitoCustom.weaponScale = Math.max(0.3, mahitoCustom.weaponScale - 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
    drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { mahitoCustom.weaponScale = Math.min(3.0, mahitoCustom.weaponScale + 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);

  } else if (activeWeaponKey === 'cj') {
    ctx.fillText('CJ WEAPONS ARSENAL //', leftConsoleX + 14, consoleY + 12);
    ctx.fillText('TRANSFORM METRICS //', rightConsoleX + 14, consoleY + 12);

    if (state.studioCjWeaponIndex === undefined) state.studioCjWeaponIndex = 0;
    const cjWeapons = [
      { id: 0, label: '1. BRASS KNUCKLES', desc: 'CQC metallic cast knuckles' },
      { id: 1, label: '2. DARPA JETPACK', desc: 'Area 69 dual rocket thrusters' },
      { id: 2, label: '3. DUAL MICRO-UZIS', desc: '9mm submachine guns' },
      { id: 3, label: '4. M134 MINIGUN', desc: '6-barrel Gatling minigun' },
      { id: 4, label: '5. INTRATEC TEC-9', desc: 'Skill 3 Drive-By submachine gun' }
    ];

    cjWeapons.forEach((w) => {
      const cardY = consoleY + 30 + w.id * 46;
      const cardW = leftConsoleW - 24;
      const cardH = 40;
      const cardX = leftConsoleX + 12;
      const isSelected = state.studioCjWeaponIndex === w.id;

      ctx.save();
      if (isSelected) {
        ctx.fillStyle = 'rgba(22, 163, 74, 0.22)';
        ctx.strokeStyle = '#16a34a';
        ctx.lineWidth = 1.5;
      } else {
        ctx.fillStyle = 'rgba(18, 22, 32, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.lineWidth = 1;
      }
      drawChamferedRect(ctx, cardX, cardY, cardW, cardH, 5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
      ctx.font = '900 10px "Rajdhani", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(w.label, cardX + 10, cardY + 6);

      ctx.fillStyle = isSelected ? '#4ade80' : '#64748b';
      ctx.font = '900 8.5px "Rajdhani", sans-serif';
      ctx.fillText(w.desc, cardX + 10, cardY + 21);

      _registerButton(cardX, cardY, cardW, cardH, () => {
        state.studioCjWeaponIndex = w.id;
      });
    });

    const custom = state.weaponCustomizations.cj || { offsetX: 0, offsetY: 0, scale: 1.0, angleOffset: 0 };
    let curY = consoleY + 34;

    const modeW = Math.floor((rightConsoleW - 44) / 3);
    const isPosMode = (state.studioSelectedDetail === 'position');
    const isScaleMode = (state.studioSelectedDetail === 'scale_angle');
    const isPropMode = (state.studioSelectedDetail === 'proportions');

    drawButton('📍 POS', rightConsoleX + 14 + modeW / 2, curY + 10, () => {
      state.studioSelectedDetail = 'position';
    }, modeW, 22, isPosMode ? '#16a34a' : null, 3);

    drawButton('📐 ROT', rightConsoleX + 22 + modeW + modeW / 2, curY + 10, () => {
      state.studioSelectedDetail = 'scale_angle';
    }, modeW, 22, isScaleMode ? '#16a34a' : null, 3);

    drawButton('📏 PROP', rightConsoleX + 30 + modeW * 2 + modeW / 2, curY + 10, () => {
      state.studioSelectedDetail = 'proportions';
    }, modeW, 22, isPropMode ? '#16a34a' : null, 3);

    curY += 40;

    if (state.studioSelectedDetail === 'position') {
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11.5px "Rajdhani", sans-serif';
      ctx.fillText(`OFFSET X: ${Math.round(custom.offsetX)}px`, rightConsoleX + 14, curY + 4);
      drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { custom.offsetX -= 2.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
      drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { custom.offsetX += 2.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
      curY += 36;

      ctx.fillText(`OFFSET Y: ${Math.round(custom.offsetY)}px`, rightConsoleX + 14, curY + 4);
      drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { custom.offsetY -= 2.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
      drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { custom.offsetY += 2.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
      curY += 36;

      ctx.fillStyle = '#64748b';
      ctx.font = '900 9.5px "Rajdhani", sans-serif';
      ctx.fillText('DRAG TEAL HANDLE IN VIEWPORT', rightConsoleX + 14, curY + 10);
      ctx.fillText('FOR REAL-TIME POSITIONING', rightConsoleX + 14, curY + 26);
    } else if (state.studioSelectedDetail === 'scale_angle') {
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11.5px "Rajdhani", sans-serif';
      ctx.fillText(`SCALE: ${custom.scale.toFixed(2)}x`, rightConsoleX + 14, curY + 4);
      drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { custom.scale = Math.max(0.3, custom.scale - 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
      drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { custom.scale = Math.min(3.0, custom.scale + 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
      curY += 36;

      const deg = Math.round(custom.angleOffset * (180 / Math.PI));
      ctx.fillText(`ROTATION: ${deg}°`, rightConsoleX + 14, curY + 4);
      drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { custom.angleOffset -= 0.05; saveWeaponCustomizations(); }, 22, 18, null, 2);
      drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { custom.angleOffset += 0.05; saveWeaponCustomizations(); }, 22, 18, null, 2);
      curY += 36;

      ctx.fillStyle = '#64748b';
      ctx.font = '900 9.5px "Rajdhani", sans-serif';
      ctx.fillText('DRAG AMBER HANDLE IN VIEWPORT', rightConsoleX + 14, curY + 10);
      ctx.fillText('FOR REAL-TIME ROTATION & SCALE', rightConsoleX + 14, curY + 26);
    } else if (state.studioSelectedDetail === 'proportions') {
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11.5px "Rajdhani", sans-serif';
      ctx.fillText(`WIDTH: ${custom.widthScale.toFixed(2)}x`, rightConsoleX + 14, curY + 4);
      drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { custom.widthScale = Math.max(0.3, custom.widthScale - 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
      drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { custom.widthScale = Math.min(3.0, custom.widthScale + 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
      curY += 36;

      ctx.fillText(`LENGTH: ${custom.lengthScale.toFixed(2)}x`, rightConsoleX + 14, curY + 4);
      drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { custom.lengthScale = Math.max(0.3, custom.lengthScale - 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
      drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { custom.lengthScale = Math.min(3.0, custom.lengthScale + 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
      curY += 36;

      ctx.fillStyle = '#64748b';
      ctx.font = '900 9.5px "Rajdhani", sans-serif';
      ctx.fillText('DRAG AMBER HANDLE IN VIEWPORT', rightConsoleX + 14, curY + 10);
      ctx.fillText('FOR REAL-TIME PROPORTIONS', rightConsoleX + 14, curY + 26);
    }
  } else if (activeWeaponKey === 'zenitsu') {
    ctx.fillText('KATANA ASSEMBLY PARTS //', leftConsoleX + 14, consoleY + 12);
    ctx.fillText('PART CALIBRATION //', rightConsoleX + 14, consoleY + 12);

    if (state.studioZenitsuPart === undefined) state.studioZenitsuPart = 'overall';

    const zenitsuParts = [
      { id: 'overall', label: '[ALL] ASSEMBLY', desc: 'Whole Katana & grip sync' },
      { id: 'blade', label: '1. BLADE (NAGASA)', desc: 'Lightning hamon edge' },
      { id: 'tsuba', label: '2. GUARD (TSUBA)', desc: 'Black & gold oval disc' },
      { id: 'habaki', label: '3. COLLAR (HABAKI)', desc: 'Blade collar connector' },
      { id: 'handle', label: '4. HANDLE (TSUKA)', desc: 'Tsuka wrap & pommel' },
      { id: 'hands', label: '5. HANDS GRIP', desc: 'Two-hand grip & size' }
    ];

    zenitsuParts.forEach((part, idx) => {
      const cardY = consoleY + 28 + idx * 47;
      const cardW = leftConsoleW - 24;
      const cardH = 41;
      const cardX = leftConsoleX + 12;
      const isSelected = (state.studioZenitsuPart === part.id);

      ctx.save();
      if (isSelected) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
      } else {
        ctx.fillStyle = 'rgba(18, 22, 32, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.lineWidth = 1;
      }
      drawChamferedRect(ctx, cardX, cardY, cardW, cardH, 5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
      ctx.font = '900 10px "Rajdhani", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(part.label, cardX + 10, cardY + 7);

      ctx.fillStyle = isSelected ? '#f59e0b' : '#64748b';
      ctx.font = '900 8.5px "Rajdhani", sans-serif';
      ctx.fillText(part.desc, cardX + 10, cardY + 22);

      _registerButton(cardX, cardY, cardW, cardH, () => {
        state.studioZenitsuPart = part.id;
        if (!state.studioSelectedDetail) {
          state.studioSelectedDetail = 'position';
        }
      });
    });

    // Right Console Metrics for Zenitsu
    const activePartKey = state.studioZenitsuPart || 'overall';
    const zenitsuCustom = state.weaponCustomizations.zenitsu;
    if (!zenitsuCustom.parts) zenitsuCustom.parts = {};
    if (!zenitsuCustom.parts[activePartKey] && activePartKey !== 'overall') {
      zenitsuCustom.parts[activePartKey] = (activePartKey === 'hands')
        ? { offsetX: 0, offsetY: 0, scale: 1.0, spacing: 1.0 }
        : { offsetX: 0, offsetY: 0, scale: 1.0, widthScale: 1.0, lengthScale: 1.0, angleOffset: 0 };
    }
    const targetObj = (activePartKey === 'overall') ? zenitsuCustom : zenitsuCustom.parts[activePartKey];

    let curY = consoleY + 34;

    if (activePartKey === 'hands') {
      // Hands modes: POS & SIZE
      const modeW = Math.floor((rightConsoleW - 36) / 2);
      const isPosMode = (state.studioSelectedDetail === 'position');
      const isSizeMode = (state.studioSelectedDetail === 'hands_size' || state.studioSelectedDetail === 'scale_angle');

      drawButton('📍 POS', rightConsoleX + 14 + modeW / 2, curY + 10, () => {
        state.studioSelectedDetail = 'position';
      }, modeW, 22, isPosMode ? '#f59e0b' : null, 3);

      drawButton('📐 SIZE & SPACING', rightConsoleX + 22 + modeW + modeW / 2, curY + 10, () => {
        state.studioSelectedDetail = 'hands_size';
      }, modeW, 22, isSizeMode ? '#f59e0b' : null, 3);

      curY += 40;

      if (isPosMode) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11.5px "Rajdhani", sans-serif';
        ctx.fillText(`OFFSET X: ${Math.round(targetObj.offsetX || 0)}px`, rightConsoleX + 14, curY + 4);
        drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { targetObj.offsetX = (targetObj.offsetX || 0) - 1.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
        drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { targetObj.offsetX = (targetObj.offsetX || 0) + 1.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
        curY += 36;

        ctx.fillText(`OFFSET Y: ${Math.round(targetObj.offsetY || 0)}px`, rightConsoleX + 14, curY + 4);
        drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { targetObj.offsetY = (targetObj.offsetY || 0) - 1.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
        drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { targetObj.offsetY = (targetObj.offsetY || 0) + 1.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
        curY += 36;

        ctx.fillStyle = '#64748b';
        ctx.font = '900 9.5px "Rajdhani", sans-serif';
        ctx.fillText('NUDGE HANDS ALONG KATANA TSUKA', rightConsoleX + 14, curY + 10);
        ctx.fillText('FOR PERFECT TWO-HAND GRIP ALIGNMENT', rightConsoleX + 14, curY + 26);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11.5px "Rajdhani", sans-serif';
        const hScale = targetObj.scale ?? 1.0;
        ctx.fillText(`HAND SIZE: ${hScale.toFixed(2)}x`, rightConsoleX + 14, curY + 4);
        drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { targetObj.scale = Math.max(0.3, (targetObj.scale ?? 1.0) - 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
        drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { targetObj.scale = Math.min(2.5, (targetObj.scale ?? 1.0) + 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
        curY += 36;

        const hSpacing = targetObj.spacing ?? 1.0;
        ctx.fillText(`GRIP SPACING: ${hSpacing.toFixed(2)}x`, rightConsoleX + 14, curY + 4);
        drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { targetObj.spacing = Math.max(0.2, (targetObj.spacing ?? 1.0) - 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
        drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { targetObj.spacing = Math.min(2.5, (targetObj.spacing ?? 1.0) + 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
        curY += 36;

        ctx.fillStyle = '#64748b';
        ctx.font = '900 9.5px "Rajdhani", sans-serif';
        ctx.fillText('ADJUST HAND PROPORTIONS & DISTANCE', rightConsoleX + 14, curY + 10);
        ctx.fillText('BETWEEN REAR AND LEAD HANDS', rightConsoleX + 14, curY + 26);
      }
    } else {
      // General parts & overall: POS, ROT, PROP
      const modeW = Math.floor((rightConsoleW - 44) / 3);
      const isPosMode = (state.studioSelectedDetail === 'position');
      const isScaleMode = (state.studioSelectedDetail === 'scale_angle');
      const isPropMode = (state.studioSelectedDetail === 'proportions');

      drawButton('📍 POS', rightConsoleX + 14 + modeW / 2, curY + 10, () => {
        state.studioSelectedDetail = 'position';
      }, modeW, 22, isPosMode ? '#f59e0b' : null, 3);

      drawButton('📐 ROT', rightConsoleX + 22 + modeW + modeW / 2, curY + 10, () => {
        state.studioSelectedDetail = 'scale_angle';
      }, modeW, 22, isScaleMode ? '#f59e0b' : null, 3);

      drawButton('📏 PROP', rightConsoleX + 30 + modeW * 2 + modeW / 2, curY + 10, () => {
        state.studioSelectedDetail = 'proportions';
      }, modeW, 22, isPropMode ? '#f59e0b' : null, 3);

      curY += 40;

      if (isPosMode) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11.5px "Rajdhani", sans-serif';
        ctx.fillText(`OFFSET X: ${Math.round(targetObj.offsetX || 0)}px`, rightConsoleX + 14, curY + 4);
        drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { targetObj.offsetX = (targetObj.offsetX || 0) - 1.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
        drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { targetObj.offsetX = (targetObj.offsetX || 0) + 1.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
        curY += 36;

        ctx.fillText(`OFFSET Y: ${Math.round(targetObj.offsetY || 0)}px`, rightConsoleX + 14, curY + 4);
        drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { targetObj.offsetY = (targetObj.offsetY || 0) - 1.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
        drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { targetObj.offsetY = (targetObj.offsetY || 0) + 1.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
        curY += 36;

        ctx.fillStyle = '#64748b';
        ctx.font = '900 9.5px "Rajdhani", sans-serif';
        ctx.fillText('DRAG TEAL HANDLE IN VIEWPORT', rightConsoleX + 14, curY + 10);
        ctx.fillText('FOR REAL-TIME POSITIONING', rightConsoleX + 14, curY + 26);
      } else if (isScaleMode) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11.5px "Rajdhani", sans-serif';
        const curScale = targetObj.scale ?? 1.0;
        ctx.fillText(`SCALE: ${curScale.toFixed(2)}x`, rightConsoleX + 14, curY + 4);
        drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { targetObj.scale = Math.max(0.2, (targetObj.scale ?? 1.0) - 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
        drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { targetObj.scale = Math.min(3.0, (targetObj.scale ?? 1.0) + 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
        curY += 36;

        const deg = Math.round((targetObj.angleOffset || 0) * (180 / Math.PI));
        ctx.fillText(`ROTATION: ${deg}°`, rightConsoleX + 14, curY + 4);
        drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { targetObj.angleOffset = (targetObj.angleOffset || 0) - 0.05; saveWeaponCustomizations(); }, 22, 18, null, 2);
        drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { targetObj.angleOffset = (targetObj.angleOffset || 0) + 0.05; saveWeaponCustomizations(); }, 22, 18, null, 2);
        curY += 36;

        ctx.fillStyle = '#64748b';
        ctx.font = '900 9.5px "Rajdhani", sans-serif';
        ctx.fillText('DRAG AMBER HANDLE IN VIEWPORT', rightConsoleX + 14, curY + 10);
        ctx.fillText('FOR REAL-TIME ROTATION & SCALE', rightConsoleX + 14, curY + 26);
      } else if (isPropMode) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '900 11.5px "Rajdhani", sans-serif';
        const curW = targetObj.widthScale ?? 1.0;
        ctx.fillText(`WIDTH: ${curW.toFixed(2)}x`, rightConsoleX + 14, curY + 4);
        drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { targetObj.widthScale = Math.max(0.2, (targetObj.widthScale ?? 1.0) - 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
        drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { targetObj.widthScale = Math.min(3.0, (targetObj.widthScale ?? 1.0) + 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
        curY += 36;

        const curL = targetObj.lengthScale ?? 1.0;
        ctx.fillText(`LENGTH: ${curL.toFixed(2)}x`, rightConsoleX + 14, curY + 4);
        drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { targetObj.lengthScale = Math.max(0.2, (targetObj.lengthScale ?? 1.0) - 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
        drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { targetObj.lengthScale = Math.min(3.0, (targetObj.lengthScale ?? 1.0) + 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
        curY += 36;

        ctx.fillStyle = '#64748b';
        ctx.font = '900 9.5px "Rajdhani", sans-serif';
        ctx.fillText('ADJUST THICKNESS & LENGTH', rightConsoleX + 14, curY + 10);
        ctx.fillText('OF THE SELECTED COMPONENT', rightConsoleX + 14, curY + 26);
      }
    }
  } else {
    // Non-Mahito / Non-CJ Weapons Console
    ctx.fillText('CALIBRATION MODE //', leftConsoleX + 14, consoleY + 12);
    ctx.fillText('TRANSFORM METRICS //', rightConsoleX + 14, consoleY + 12);

    const detailOptions = [
      { id: 'position', label: 'POSITION (X, Y)', desc: 'Translate weapon grip point' },
      { id: 'scale_angle', label: 'SCALE & ROTATION', desc: 'Adjust size & tilt angle' },
      { id: 'proportions', label: 'PROPORTIONS (W, L)', desc: 'Adjust width & length' }
    ];

    detailOptions.forEach((opt, idx) => {
      const cardY = consoleY + 34 + idx * 56;
      const cardW = leftConsoleW - 24;
      const cardH = 48;
      const cardX = leftConsoleX + 12;
      const isSelected = state.studioSelectedDetail === opt.id;

      ctx.save();
      if (isSelected) {
        ctx.fillStyle = 'rgba(245, 158, 11, 0.20)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
      } else {
        ctx.fillStyle = 'rgba(18, 22, 32, 0.85)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.lineWidth = 1;
      }
      drawChamferedRect(ctx, cardX, cardY, cardW, cardH, 5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
      ctx.font = '900 11px "Rajdhani", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(opt.label, cardX + 10, cardY + 9);

      ctx.fillStyle = '#64748b';
      ctx.font = '900 8.5px "Rajdhani", sans-serif';
      ctx.fillText(opt.desc, cardX + 10, cardY + 26);

      _registerButton(cardX, cardY, cardW, cardH, () => {
        state.studioSelectedDetail = opt.id;
      });
    });

    const custom = state.weaponCustomizations[activeWeaponKey];
    let curY = consoleY + 34;

    if (state.studioSelectedDetail === 'position') {
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11.5px "Rajdhani", sans-serif';
      ctx.fillText(`OFFSET X: ${Math.round(custom.offsetX)}px`, rightConsoleX + 14, curY + 4);
      drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { custom.offsetX -= 2.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
      drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { custom.offsetX += 2.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
      curY += 38;

      ctx.fillText(`OFFSET Y: ${Math.round(custom.offsetY)}px`, rightConsoleX + 14, curY + 4);
      drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { custom.offsetY -= 2.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
      drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { custom.offsetY += 2.0; saveWeaponCustomizations(); }, 22, 18, null, 2);
      curY += 38;

      ctx.fillStyle = '#64748b';
      ctx.font = '900 9.5px "Rajdhani", sans-serif';
      ctx.fillText('DRAG TEAL HANDLE IN VIEWPORT', rightConsoleX + 14, curY + 10);
      ctx.fillText('FOR REAL-TIME POSITIONING', rightConsoleX + 14, curY + 26);

    } else if (state.studioSelectedDetail === 'scale_angle') {
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11.5px "Rajdhani", sans-serif';
      ctx.fillText(`SCALE: ${custom.scale.toFixed(2)}x`, rightConsoleX + 14, curY + 4);
      drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { custom.scale = Math.max(0.3, custom.scale - 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
      drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { custom.scale = Math.min(3.0, custom.scale + 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
      curY += 38;

      const deg = Math.round(custom.angleOffset * (180 / Math.PI));
      ctx.fillText(`ROTATION: ${deg}°`, rightConsoleX + 14, curY + 4);
      drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { custom.angleOffset -= 0.05; saveWeaponCustomizations(); }, 22, 18, null, 2);
      drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { custom.angleOffset += 0.05; saveWeaponCustomizations(); }, 22, 18, null, 2);
      curY += 38;

      ctx.fillStyle = '#64748b';
      ctx.font = '900 9.5px "Rajdhani", sans-serif';
      ctx.fillText('DRAG AMBER HANDLE IN VIEWPORT', rightConsoleX + 14, curY + 10);
      ctx.fillText('FOR REAL-TIME ROTATION & SCALE', rightConsoleX + 14, curY + 26);

    } else if (state.studioSelectedDetail === 'proportions') {
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11.5px "Rajdhani", sans-serif';
      ctx.fillText(`WIDTH: ${custom.widthScale.toFixed(2)}x`, rightConsoleX + 14, curY + 4);
      drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { custom.widthScale = Math.max(0.3, custom.widthScale - 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
      drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { custom.widthScale = Math.min(3.0, custom.widthScale + 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
      curY += 38;

      ctx.fillText(`LENGTH: ${custom.lengthScale.toFixed(2)}x`, rightConsoleX + 14, curY + 4);
      drawButton('−', rightConsoleX + rightConsoleW - 54, curY + 8, () => { custom.lengthScale = Math.max(0.3, custom.lengthScale - 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
      drawButton('+', rightConsoleX + rightConsoleW - 26, curY + 8, () => { custom.lengthScale = Math.min(3.0, custom.lengthScale + 0.05); saveWeaponCustomizations(); }, 22, 18, null, 2);
      curY += 38;

      ctx.fillStyle = '#64748b';
      ctx.font = '900 9.5px "Rajdhani", sans-serif';
      ctx.fillText('DRAG AMBER HANDLE IN VIEWPORT', rightConsoleX + 14, curY + 10);
      ctx.fillText('FOR REAL-TIME PROPORTIONS', rightConsoleX + 14, curY + 26);

    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '900 10px "Rajdhani", sans-serif';
      ctx.fillText('SELECT A CALIBRATION MODE ON LEFT', rightConsoleX + 14, curY + 20);
      ctx.fillText('TO ENABLE PARAMETER CONTROLS', rightConsoleX + 14, curY + 36);
    }
  }

  // ── Tier 4: Bottom Action Deck ──
  const bottomY = canvas.height - 34;
  drawButton('RESET DEFAULTS', 150, bottomY, () => {
    if (confirm(`Reset ${activeWeaponKey.toUpperCase()} customizations to default?`)) {
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
      } else if (activeWeaponKey === 'zenitsu') {
        const custom = state.weaponCustomizations.zenitsu;
        custom.offsetX = 0;
        custom.offsetY = 0;
        custom.scale = 1.0;
        custom.widthScale = 1.0;
        custom.lengthScale = 1.0;
        custom.angleOffset = 0;
        custom.parts = {
          blade:  { offsetX: 0, offsetY: 0, scale: 1.0, widthScale: 1.0, lengthScale: 1.0, angleOffset: 0 },
          tsuba:  { offsetX: 0, offsetY: 0, scale: 1.0, widthScale: 1.0, lengthScale: 1.0, angleOffset: 0 },
          habaki: { offsetX: 0, offsetY: 0, scale: 1.0, widthScale: 1.0, lengthScale: 1.0, angleOffset: 0 },
          handle: { offsetX: 0, offsetY: 0, scale: 1.0, widthScale: 1.0, lengthScale: 1.0, angleOffset: 0 },
          hands:  { offsetX: 0, offsetY: 0, scale: 1.0, spacing: 1.0 }
        };
      } else {
        const custom = state.weaponCustomizations[activeWeaponKey];
        custom.offsetX = 0;
        custom.offsetY = 0;
        custom.scale = 1.0;
        custom.widthScale = 1.0;
        custom.lengthScale = 1.0;
        custom.angleOffset = 0;
      }
      saveWeaponCustomizations();
    }
  }, 140, 28, null, 4);

  drawButton('⌂ BACK TO MENU', 390, bottomY, () => {
    state.gameState = 'title';
  }, 140, 28, null, 4);
}

// ─────────────────────────────────────────────
// mouse down, move, up event listeners
// ─────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('resize', invalidateCachedTargetRect);
  window.addEventListener('scroll', invalidateCachedTargetRect, { passive: true });

  const eventTarget = state.pixiApp ? state.pixiApp.view : state.canvas;
  if (eventTarget && typeof eventTarget.addEventListener === 'function') {
    eventTarget.addEventListener('mousedown', (e) => {
      if (state.gameState !== 'weaponStudio' || state.studioSelectedDetail === null) return;

      invalidateCachedTargetRect();
      const rect = getCachedTargetRect(eventTarget);
      const scaleX = state.canvas.width / (rect.width || state.canvas.width);
      const scaleY = state.canvas.height / (rect.height || state.canvas.height);
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const currentScale = state.studioPreviewScale;
      const heroY = VIEWPORT_Y + VIEWPORT_H / 2;
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
        if (Math.hypot(localX - kx, localY - ky) < 14) {
          activeDragFinger = i;
          activeDragType = 'knuckle';
          return;
        }

        // Tip click check
        if (Math.hypot(localX - tx, localY - ty) < 14) {
          activeDragFinger = i;
          activeDragType = 'tip';
          return;
        }
      } else if (activeWeaponKey === 'zenitsu') {
        const custom = state.weaponCustomizations.zenitsu;
        const partKey = state.studioZenitsuPart || 'overall';
        const target = (partKey === 'overall')
          ? custom
          : ((custom.parts && custom.parts[partKey]) ? custom.parts[partKey] : custom);

        const baseLx = -64 + custom.offsetX + (partKey !== 'overall' ? (target.offsetX || 0) : 0);
        const baseLy = custom.offsetY + (partKey !== 'overall' ? (target.offsetY || 0) : 0);

        if (state.studioSelectedDetail === 'position') {
          if (Math.hypot(localX - baseLx, localY - baseLy) < 16) {
            isDraggingBase = true;
            return;
          }
        } else if (state.studioSelectedDetail === 'scale_angle' || state.studioSelectedDetail === 'hands_size') {
          const lineLen = 70;
          const curScale = target.scale ?? 1.0;
          const curAngle = target.angleOffset ?? 0;
          const tipLx = baseLx + lineLen * curScale * Math.cos(curAngle);
          const tipLy = baseLy + lineLen * curScale * Math.sin(curAngle);
          if (Math.hypot(localX - tipLx, localY - tipLy) < 16) {
            isDraggingTip = true;
            return;
          }
        }
      } else {
        const custom = state.weaponCustomizations[activeWeaponKey];
        let offsetX = -40;
        if (activeWeaponKey === 'cronos') offsetX = -55;
        else if (activeWeaponKey === 'ruby') offsetX = -75;
        else if (activeWeaponKey === 'rubbick' || activeWeaponKey === 'uryu') offsetX = 0;

        const baseLx = offsetX + custom.offsetX;
        const baseLy = custom.offsetY;

        if (state.studioSelectedDetail === 'position') {
          // Grip anchor check
          if (Math.hypot(localX - baseLx, localY - baseLy) < 14) {
            isDraggingBase = true;
            return;
          }
        } else if (state.studioSelectedDetail === 'scale_angle') {
          const lineLen = 70;
          const tipLx = baseLx + lineLen * custom.scale * Math.cos(custom.angleOffset);
          const tipLy = baseLy + lineLen * custom.scale * Math.sin(custom.angleOffset);

          // Tip handle check
          if (Math.hypot(localX - tipLx, localY - tipLy) < 14) {
            isDraggingTip = true;
            return;
          }
        }
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (state.gameState !== 'weaponStudio' || state.studioSelectedDetail === null) return;
      const isDraggingMahito = (activeDragFinger >= 0 && state.studioSelectedDetail === 'finger');
      const isDraggingNormal = isDraggingBase || isDraggingTip;
      if (!isDraggingMahito && !isDraggingNormal) return;

      const rect = getCachedTargetRect(eventTarget);
      const scaleX = state.canvas.width / (rect.width || state.canvas.width);
      const scaleY = state.canvas.height / (rect.height || state.canvas.height);
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      const currentScale = state.studioPreviewScale;
      const heroY = VIEWPORT_Y + VIEWPORT_H / 2;
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
      } else if (activeWeaponKey === 'zenitsu') {
        const custom = state.weaponCustomizations.zenitsu;
        const partKey = state.studioZenitsuPart || 'overall';
        const target = (partKey === 'overall')
          ? custom
          : ((custom.parts && custom.parts[partKey]) ? custom.parts[partKey] : custom);

        if (isDraggingBase && state.studioSelectedDetail === 'position') {
          if (partKey === 'overall') {
            custom.offsetX = localX - (-64);
            custom.offsetY = localY;
          } else {
            target.offsetX = localX - (-64 + custom.offsetX);
            target.offsetY = localY - custom.offsetY;
          }
        } else if (isDraggingTip && (state.studioSelectedDetail === 'scale_angle' || state.studioSelectedDetail === 'hands_size')) {
          const parentX = -64 + custom.offsetX + (partKey !== 'overall' ? (target.offsetX || 0) : 0);
          const parentY = custom.offsetY + (partKey !== 'overall' ? (target.offsetY || 0) : 0);
          const dx = localX - parentX;
          const dy = localY - parentY;
          const lineLen = 70;
          target.scale = Math.max(0.2, Math.hypot(dx, dy) / lineLen);
          if (partKey !== 'hands') {
            target.angleOffset = Math.atan2(dy, dx);
          }
        }
      } else {
        const custom = state.weaponCustomizations[activeWeaponKey];
        let offsetX = -40;
        if (activeWeaponKey === 'cronos') offsetX = -55;
        else if (activeWeaponKey === 'ruby') offsetX = -75;
        else if (activeWeaponKey === 'rubbick' || activeWeaponKey === 'uryu') offsetX = 0;

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
}
