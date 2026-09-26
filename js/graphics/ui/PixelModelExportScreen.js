// ─────────────────────────────────────────────
// Default / Skinless Fighter Model — 2D Discrete Pixel Art PNG Exporter
// Authentic Upright Faceless Minimalist Aesthetic (Rules 19, 20 & 35)
// ─────────────────────────────────────────────
import { state } from '../../core/state.js';
import { audioSystem } from '../../systems/audioSystem.js';

export const PIXEL_MODEL_PALETTES = [
  { id: 'peach', label: 'Anime Peach', base: '#FFE0BD', shadow: '#E5B88F', dark: '#C48858', glint: '#FFFFFF', isDark: false },
  { id: 'tan', label: 'Golden Tan', base: '#E0A882', shadow: '#C0855A', dark: '#9E5B2E', glint: '#FFFFFF', isDark: false },
  { id: 'amber', label: 'Warm Amber', base: '#D97706', shadow: '#B45309', dark: '#78350F', glint: '#FDE68A', isDark: true },
  { id: 'obsidian', label: 'Obsidian Shadow', base: '#27272A', shadow: '#18181B', dark: '#09090B', glint: '#71717A', isDark: true },
  { id: 'mannequin', label: 'Pure Mannequin', base: '#F4F4F5', shadow: '#D4D4D8', dark: '#A1A1AA', glint: '#FFFFFF', isDark: false },
  { id: 'cyan', label: 'Cyber Cyan', base: '#38BDF8', shadow: '#0284C7', dark: '#0369A1', glint: '#E0F2FE', isDark: true },
  { id: 'crimson', label: 'Crimson Brawler', base: '#EF4444', shadow: '#DC2626', dark: '#991B1B', glint: '#FEE2E2', isDark: true },
  { id: 'emerald', label: 'Emerald Void', base: '#10B981', shadow: '#059669', dark: '#047857', glint: '#D1FAE5', isDark: true },
  { id: 'amethyst', label: 'Amethyst Neon', base: '#A855F7', shadow: '#9333EA', dark: '#6B21A8', glint: '#F3E8FF', isDark: true },
];

export const pixelModelState = {
  paletteId: 'peach',
  handMode: 'none',       // 'none' (skinless circle body) | 'both' | 'front'
  outline: true,          // true (#0E0F14) | false
  resolution: 256,        // 64 | 128 | 256 | 512
  bgMode: 'transparent',  // 'transparent' | 'dark' | 'black' | 'white'
};

/**
 * Draws discrete authentic pixel art fighter body & hands into target canvas context
 */
export function drawPixelBaseModel(ctx, width, height, options = {}) {
  const palette = PIXEL_MODEL_PALETTES.find(p => p.id === (options.paletteId || pixelModelState.paletteId)) || PIXEL_MODEL_PALETTES[0];
  const handMode = options.handMode || pixelModelState.handMode;
  const showOutline = (options.outline !== undefined) ? options.outline : pixelModelState.outline;
  const outlineColor = '#0E0F14';

  ctx.imageSmoothingEnabled = false;

  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  const scale = width / 64; // Normalized 64x64 canonical grid
  const r = 18 * scale;
  const P = Math.max(1, Math.round(1.0 * scale));
  const steps = Math.ceil((r + P * 2) / P);

  // ── LAYER 1: Back Hand (Fist on forward +X side, behind body) ──
  if (handMode === 'both') {
    const handX = Math.round(cx + (18 * scale));
    const handY = Math.round(cy - (3 * scale));
    const handR = 4.8 * scale;
    _drawDiscretePixelHand(ctx, handX, handY, handR, P, palette.base, showOutline ? outlineColor : null);
  }

  // ── LAYER 2: Upright Faceless Circle Body ──
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > r) continue;

      const px = Math.round(cx + rx - P / 2);
      const py = Math.round(cy + ry - P / 2);

      // 4-neighbor attached boundary test for solid manga ink outline
      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > r ||
        Math.hypot((gx - 1) * P, gy * P) > r ||
        Math.hypot(gx * P, (gy + 1) * P) > r ||
        Math.hypot(gx * P, (gy - 1) * P) > r
      );

      if (isBorder && showOutline) {
        ctx.fillStyle = outlineColor;
        ctx.fillRect(px, py, P, P);
        continue;
      }

      // 4-Tier Authentic Stepped Anime Shading
      // 1. Specular Crown Glint / Brow Highlight
      if (ry < -r * 0.45 && rx > -r * 0.35 && rx < r * 0.5) {
        ctx.fillStyle = palette.glint;
      }
      // 2. Forehead & Cheek Light Rim
      else if (ry < -r * 0.15 && rx > -r * 0.6) {
        ctx.fillStyle = palette.base;
      }
      // 3. Subtle Collar / Neck Seam Shadow
      else if (ry >= r * 0.15 && ry <= r * 0.32 && Math.abs(rx) < r * 0.75) {
        ctx.fillStyle = palette.shadow;
      }
      // 4. Deep Lower Torso / Ambient Occlusion
      else if (ry > r * 0.38) {
        ctx.fillStyle = palette.dark;
      }
      // Base Tone Fill
      else {
        ctx.fillStyle = palette.base;
      }

      ctx.fillRect(px, py, P, P);
    }
  }

  // ── LAYER 3: Front Hand (Guard Fist centered on body) ──
  if (handMode === 'both' || handMode === 'front') {
    const handX = Math.round(cx - (3 * scale));
    const handY = Math.round(cy + (4.5 * scale));
    const handR = 5.2 * scale;
    _drawDiscretePixelHand(ctx, handX, handY, handR, P, palette.base, showOutline ? outlineColor : null);
  }
}

/**
 * Renders discrete pixel art fist
 */
function _drawDiscretePixelHand(ctx, cx, cy, radius, P, color, outlineColor) {
  const steps = Math.ceil((radius + P) / P);
  for (let gy = -steps; gy <= steps; gy++) {
    for (let gx = -steps; gx <= steps; gx++) {
      const rx = gx * P;
      const ry = gy * P;
      const dist = Math.hypot(rx, ry);
      if (dist > radius) continue;

      const px = Math.round(cx + rx - P / 2);
      const py = Math.round(cy + ry - P / 2);

      const isBorder = (
        Math.hypot((gx + 1) * P, gy * P) > radius ||
        Math.hypot((gx - 1) * P, gy * P) > radius ||
        Math.hypot(gx * P, (gy + 1) * P) > radius ||
        Math.hypot(gx * P, (gy - 1) * P) > radius
      );

      if (isBorder && outlineColor) {
        ctx.fillStyle = outlineColor;
      } else if (ry < -radius * 0.35 && rx > -radius * 0.3) {
        ctx.fillStyle = '#FFFFFF';
      } else if (ry > radius * 0.35 || rx < -radius * 0.45) {
        ctx.fillStyle = '#000000';
        ctx.globalAlpha = 0.25;
        ctx.fillRect(px, py, P, P);
        ctx.globalAlpha = 1.0;
        continue;
      } else {
        ctx.fillStyle = color;
      }

      ctx.fillRect(px, py, P, P);
    }
  }
}

/**
 * Updates live preview canvas in settings modal
 */
export function updatePixelModelPreview() {
  const canvas = document.getElementById('pixelModelPreviewCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Background Preview Mode
  if (pixelModelState.bgMode === 'dark') {
    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 0, w, h);
  } else if (pixelModelState.bgMode === 'black') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
  } else if (pixelModelState.bgMode === 'white') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
  } else {
    // Checkerboard transparent preview pattern
    const gridSize = 8;
    for (let y = 0; y < h; y += gridSize) {
      for (let x = 0; x < w; x += gridSize) {
        ctx.fillStyle = ((x / gridSize + y / gridSize) % 2 === 0) ? '#1E293B' : '#0F172A';
        ctx.fillRect(x, y, gridSize, gridSize);
      }
    }
  }

  drawPixelBaseModel(ctx, w, h);

  // Sync the download anchor attributes immediately for 100% native browser download
  const btnDownload = document.getElementById('btnPixelModelDownload');
  if (btnDownload) {
    const exportCanvas = _createExportCanvas();
    if (exportCanvas) {
      const res = pixelModelState.resolution || 256;
      const fileName = `circle-pixel-model-${pixelModelState.paletteId}-${pixelModelState.handMode}-${res}x${res}.png`;
      const dataUrl = exportCanvas.toDataURL('image/png');
      btnDownload.href = dataUrl;
      btnDownload.download = fileName;
      btnDownload.setAttribute('download', fileName);
    }
  }
}

/**
 * Creates rendered offscreen canvas ready for export
 */
function _createExportCanvas() {
  const res = pixelModelState.resolution || 256;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = res;
  exportCanvas.height = res;

  const ctx = exportCanvas.getContext('2d', { alpha: true });
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = false;

  // Fill solid background if non-transparent mode selected
  if (pixelModelState.bgMode === 'dark') {
    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 0, res, res);
  } else if (pixelModelState.bgMode === 'black') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, res, res);
  } else if (pixelModelState.bgMode === 'white') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, res, res);
  } else {
    ctx.clearRect(0, 0, res, res);
  }

  // Render the authentic discrete pixel art model onto export canvas
  drawPixelBaseModel(ctx, res, res);
  return exportCanvas;
}

/**
 * Shows temporary toast notification feedback
 */
function _showExportToast(msg) {
  const toast = document.getElementById('pixelModelToast');
  if (toast) {
    toast.innerText = msg;
    toast.classList.add('active');
    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('active'), 3200);
  }
}

/**
 * Exports crisp, transparent or solid PNG download
 */
export async function downloadPixelModelPNG(e) {
  const exportCanvas = _createExportCanvas();
  if (!exportCanvas) return;

  const res = pixelModelState.resolution || 256;
  const fileName = `circle-pixel-model-${pixelModelState.paletteId}-${pixelModelState.handMode}-${res}x${res}.png`;
  const dataUrl = exportCanvas.toDataURL('image/png');

  // ── Strategy 1: Desktop Electron App Native Save Dialog ──
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.showSaveImageDialog === 'function') {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const result = await window.electronAPI.showSaveImageDialog({
        defaultName: fileName,
        base64Data: dataUrl
      });

      if (result && result.success) {
        _showExportToast(`💾 SAVED: ${fileName}`);
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
          audioSystem.playSFX('skill_dash5', 0.35);
        }
        return;
      } else if (result && result.canceled) {
        return; // User canceled the dialog
      }
    } catch (err) {
      console.warn('Electron save dialog error, falling back to direct save:', err);
      try {
        const directRes = await window.electronAPI.saveImageFile({ fileName, base64Data: dataUrl });
        if (directRes && directRes.success) {
          _showExportToast(`💾 SAVED TO DOWNLOADS: ${fileName}`);
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash5', 0.35);
          return;
        }
      } catch (err2) {
        console.error('Electron direct save failed:', err2);
      }
    }
  }

  // ── Strategy 2: Modern Browser File System Access API (Save As Dialog) ──
  if (typeof window !== 'undefined' && window.showSaveFilePicker && location.protocol !== 'file:') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'PNG Image (*.png)',
          accept: { 'image/png': ['.png'] }
        }]
      });
      const writable = await handle.createWritable();
      const byteCharacters = atob(dataUrl.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      await writable.write(blob);
      await writable.close();
      _showExportToast(`💾 SAVED: ${fileName}`);
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
        audioSystem.playSFX('skill_dash5', 0.35);
      }
      return;
    } catch (pickErr) {
      if (pickErr.name === 'AbortError') return; // User canceled
      console.warn('showSaveFilePicker fallback:', pickErr);
    }
  }

  // ── Strategy 3: Standard Web Browser Native Anchor Download ──
  const btnDownload = document.getElementById('btnPixelModelDownload');
  if (btnDownload) {
    btnDownload.href = dataUrl;
    btnDownload.download = fileName;
    btnDownload.setAttribute('download', fileName);
  }

  _showExportToast(`💾 SAVED: ${fileName}`);
  if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
    audioSystem.playSFX('skill_dash5', 0.35);
  }
}

/**
 * Saves pixel model directly to game's Assets/model folder
 */
export async function savePixelModelToAssets() {
  const exportCanvas = _createExportCanvas();
  if (!exportCanvas) return;

  const res = pixelModelState.resolution || 256;
  const fileName = `circle-pixel-model-${pixelModelState.paletteId}-${pixelModelState.handMode}-${res}x${res}.png`;
  const dataUrl = exportCanvas.toDataURL('image/png');

  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.saveToAssetsModel === 'function') {
    try {
      const resSave = await window.electronAPI.saveToAssetsModel({ fileName, base64Data: dataUrl });
      if (resSave && resSave.success) {
        _showExportToast(`📥 SAVED TO Assets/model/!`);
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash5', 0.35);
        return;
      }
    } catch (err) {
      console.error('Save to assets error:', err);
    }
  }

  // Web Browser fallback: trigger standard download
  downloadPixelModelPNG();
}

/**
 * Copies pixel model PNG directly to operating system clipboard
 */
export async function copyPixelModelToClipboard() {
  const exportCanvas = _createExportCanvas();
  if (!exportCanvas) return;

  try {
    if (navigator.clipboard && window.ClipboardItem && exportCanvas.toBlob) {
      exportCanvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          _showExportToast(`📋 PNG COPIED TO CLIPBOARD!`);
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) {
            audioSystem.playSFX('skill_dash5', 0.35);
          }
        } catch (clipErr) {
          console.warn('Clipboard write failure:', clipErr);
          _showExportToast(`⚠️ Clipboard permission denied. Use Download button.`);
        }
      }, 'image/png');
    } else {
      _showExportToast(`⚠️ Clipboard image copy not supported in this browser.`);
    }
  } catch (err) {
    console.error('Clipboard copy error:', err);
    _showExportToast(`⚠️ Clipboard copy error.`);
  }
}

/**
 * Opens output Downloads or Assets folder in File Explorer
 */
export function openSavedFolder() {
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.openDownloadsFolder === 'function') {
    window.electronAPI.openDownloadsFolder();
    _showExportToast(`📁 OPENING DOWNLOADS FOLDER...`);
  } else if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.openAssetsFolder === 'function') {
    window.electronAPI.openAssetsFolder();
    _showExportToast(`📁 OPENING ASSETS FOLDER...`);
  } else {
    _showExportToast(`📁 Files save to your Browser Downloads folder`);
  }
}

if (typeof window !== 'undefined') {
  window.downloadPixelModelPNG = downloadPixelModelPNG;
  window.savePixelModelToAssets = savePixelModelToAssets;
  window.copyPixelModelToClipboard = copyPixelModelToClipboard;
  window.openSavedFolder = openSavedFolder;
}

/**
 * Initializes DOM listeners and UI state for Pixel Model screen
 */
export function initPixelModelExportUI() {
  // Sync palette swatches
  const paletteContainer = document.getElementById('pixelModelPaletteList');
  if (paletteContainer) {
    paletteContainer.innerHTML = '';
    PIXEL_MODEL_PALETTES.forEach((p) => {
      const btn = document.createElement('button');
      btn.className = `pixel-palette-chip ${p.id === pixelModelState.paletteId ? 'active' : ''}`;
      btn.dataset.palette = p.id;
      btn.title = p.label;
      btn.style.backgroundColor = p.base;
      btn.innerHTML = `<span class="palette-chip-inner" style="background-color: ${p.base};"></span>`;
      btn.addEventListener('click', () => {
        pixelModelState.paletteId = p.id;
        document.querySelectorAll('.pixel-palette-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const nameLabel = document.getElementById('pixelModelPaletteLabel');
        if (nameLabel) nameLabel.innerText = p.label.toUpperCase();
        updatePixelModelPreview();
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash1', 0.2);
      });
      paletteContainer.appendChild(btn);
    });
  }

  // Hand mode buttons
  document.querySelectorAll('[data-handmode]').forEach((btn) => {
    btn.onclick = () => {
      const mode = btn.dataset.handmode;
      pixelModelState.handMode = mode;
      document.querySelectorAll('[data-handmode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePixelModelPreview();
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash1', 0.2);
    };
  });

  // Resolution buttons
  document.querySelectorAll('[data-resolution]').forEach((btn) => {
    btn.onclick = () => {
      const res = parseInt(btn.dataset.resolution, 10);
      pixelModelState.resolution = res;
      document.querySelectorAll('[data-resolution]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const resLabel = document.getElementById('pixelModelResLabel');
      if (resLabel) resLabel.innerText = `${res} x ${res} PX`;
      updatePixelModelPreview();
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash1', 0.2);
    };
  });

  // Background buttons
  document.querySelectorAll('[data-bgmode]').forEach((btn) => {
    btn.onclick = () => {
      const bg = btn.dataset.bgmode;
      pixelModelState.bgMode = bg;
      document.querySelectorAll('[data-bgmode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updatePixelModelPreview();
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash1', 0.2);
    };
  });

  // Outline button
  const btnOutline = document.getElementById('btnPixelModelOutline');
  if (btnOutline) {
    btnOutline.onclick = () => {
      pixelModelState.outline = !pixelModelState.outline;
      btnOutline.innerText = pixelModelState.outline ? 'INK OUTLINE: ON' : 'INK OUTLINE: OFF';
      btnOutline.classList.toggle('active', pixelModelState.outline);
      updatePixelModelPreview();
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash1', 0.2);
    };
  }

  // Export Download button / link
  const btnDownload = document.getElementById('btnPixelModelDownload');
  if (btnDownload) {
    btnDownload.onclick = (e) => {
      downloadPixelModelPNG(e);
    };
  }

  // Save to Assets button
  const btnSaveAssets = document.getElementById('btnPixelModelSaveAssets');
  if (btnSaveAssets) {
    btnSaveAssets.onclick = () => {
      savePixelModelToAssets();
    };
  }

  // Copy to Clipboard button
  const btnCopy = document.getElementById('btnPixelModelCopy');
  if (btnCopy) {
    btnCopy.onclick = () => {
      copyPixelModelToClipboard();
    };
  }

  // Open Folder button
  const btnOpenFolder = document.getElementById('btnPixelModelOpenFolder');
  if (btnOpenFolder) {
    btnOpenFolder.onclick = () => {
      openSavedFolder();
    };
  }

  updatePixelModelPreview();
}
