// ─────────────────────────────────────────────
// Image Background Remover & Transparent PNG Converter
// High-Performance In-Browser Alpha Cutout & Chroma Keying Engine
// ─────────────────────────────────────────────
import { audioSystem } from '../../systems/audioSystem.js';

export const bgRemoverState = {
  sourceImage: null,          // Image element or ImageBitmap
  sourceFileName: 'custom-sprite.png',
  targetColor: { r: 255, g: 255, b: 255 }, // Default sample white background
  targetColorHex: '#ffffff',
  tolerance: 18,              // 0 - 100%
  mode: 'contiguous',         // 'contiguous' (outer flood fill) | 'global' (all matching)
  feather: 1,                 // 0 - 5px edge feathering
  autoCrop: false,            // trim outer transparent margins
  bgPreviewMode: 'checker',   // 'checker' | 'dark' | 'white' | 'black'
  eyedropperActive: false,
};

let _cachedProcessedCanvas = null;

/**
 * Initializes DOM listeners and UI state for Image Background Remover screen
 */
export function initImageBgRemoverUI() {
  const fileInput = document.getElementById('bgRemoverFileInput');
  const dropZone = document.getElementById('bgRemoverDropZone');
  const canvas = document.getElementById('bgRemoverPreviewCanvas');

  // File input change
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) _loadImageFromFile(file);
    });
  }

  // Browse File Manager button
  const btnBrowse = document.getElementById('btnBgRemoverBrowse');
  if (btnBrowse) {
    btnBrowse.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openImageFromFileManager();
    });
  }

  // Open Assets Folder button (Just like Arena Music!)
  const btnOpenAssets = document.getElementById('btnBgRemoverOpenAssets');
  if (btnOpenAssets) {
    btnOpenAssets.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.openAssetsFolder === 'function') {
        window.electronAPI.openAssetsFolder();
      } else if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.openBgmFolder === 'function') {
        window.electronAPI.openDownloadsFolder();
      } else {
        _showToast('📁 Model Assets folder is at: Assets/model/');
      }
    });
  }

  // Quick Asset dropdown selector
  const selectAsset = document.getElementById('bgRemoverAssetSelect');
  if (selectAsset) {
    selectAsset.addEventListener('change', (e) => {
      const src = e.target.value;
      if (!src) return;
      _loadImageFromUrl(src, src.split('/').pop());
    });
  }

  // Drag & drop support on dropZone
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) _loadImageFromFile(file);
    });
  }

  // Paste from clipboard button & global paste listener
  const btnPaste = document.getElementById('btnBgRemoverPaste');
  if (btnPaste) {
    btnPaste.addEventListener('click', async () => {
      await _pasteFromClipboard();
    });
  }

  // Tolerance slider
  const sliderTol = document.getElementById('bgRemoverToleranceSlider');
  const labelTol = document.getElementById('bgRemoverToleranceVal');
  if (sliderTol) {
    sliderTol.addEventListener('input', (e) => {
      bgRemoverState.tolerance = parseInt(e.target.value, 10);
      if (labelTol) labelTol.innerText = `${bgRemoverState.tolerance}%`;
      processAndRenderImage();
    });
  }

  // Feather slider
  const sliderFeather = document.getElementById('bgRemoverFeatherSlider');
  const labelFeather = document.getElementById('bgRemoverFeatherVal');
  if (sliderFeather) {
    sliderFeather.addEventListener('input', (e) => {
      bgRemoverState.feather = parseInt(e.target.value, 10);
      if (labelFeather) labelFeather.innerText = `${bgRemoverState.feather}px`;
      processAndRenderImage();
    });
  }

  // Mode buttons (Contiguous vs Global)
  document.querySelectorAll('[data-bgrmode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      bgRemoverState.mode = btn.dataset.bgrmode;
      document.querySelectorAll('[data-bgrmode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      processAndRenderImage();
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash1', 0.2);
    });
  });

  // Auto-Crop toggle button
  const btnCrop = document.getElementById('btnBgRemoverAutoCrop');
  if (btnCrop) {
    btnCrop.addEventListener('click', () => {
      bgRemoverState.autoCrop = !bgRemoverState.autoCrop;
      btnCrop.classList.toggle('active', bgRemoverState.autoCrop);
      btnCrop.innerText = bgRemoverState.autoCrop ? 'TRIM MARGINS: ON' : 'TRIM MARGINS: OFF';
      processAndRenderImage();
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash1', 0.2);
    });
  }

  // Eyedropper tool toggle button
  const btnEyedropper = document.getElementById('btnBgRemoverEyedropper');
  if (btnEyedropper) {
    btnEyedropper.addEventListener('click', () => {
      bgRemoverState.eyedropperActive = !bgRemoverState.eyedropperActive;
      btnEyedropper.classList.toggle('active', bgRemoverState.eyedropperActive);
      if (canvas) canvas.style.cursor = bgRemoverState.eyedropperActive ? 'crosshair' : 'default';
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash1', 0.2);
    });
  }

  // Canvas click for Eyedropper sampling
  if (canvas) {
    canvas.addEventListener('click', (e) => {
      if (!bgRemoverState.sourceImage) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const canvasClickX = (e.clientX - rect.left) * scaleX;
      const canvasClickY = (e.clientY - rect.top) * scaleY;

      if (_cachedProcessedCanvas) {
        const srcW = _cachedProcessedCanvas.width;
        const srcH = _cachedProcessedCanvas.height;
        const scale = Math.min((canvas.width - 20) / srcW, (canvas.height - 20) / srcH);
        const destW = Math.round(srcW * scale);
        const destH = Math.round(srcH * scale);
        const destX = Math.round((canvas.width - destW) / 2);
        const destY = Math.round((canvas.height - destH) / 2);

        const imgX = Math.floor((canvasClickX - destX) / scale);
        const imgY = Math.floor((canvasClickY - destY) / scale);
        _sampleColorFromSource(imgX, imgY);
      } else {
        _sampleColorFromSource(Math.floor(canvasClickX), Math.floor(canvasClickY));
      }

      bgRemoverState.eyedropperActive = false;
      if (btnEyedropper) btnEyedropper.classList.remove('active');
      canvas.style.cursor = 'default';
      processAndRenderImage();
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash2', 0.3);
    });
  }

  // Color picker input
  const colorPicker = document.getElementById('bgRemoverColorInput');
  if (colorPicker) {
    colorPicker.addEventListener('input', (e) => {
      _setTargetColorFromHex(e.target.value);
      processAndRenderImage();
    });
  }

  // Auto-Detect Corner Color Button
  const btnAutoCorner = document.getElementById('btnBgRemoverAutoCorner');
  if (btnAutoCorner) {
    btnAutoCorner.addEventListener('click', () => {
      _autoDetectCornerColor();
      processAndRenderImage();
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash3', 0.3);
    });
  }

  // Background preview mode buttons
  document.querySelectorAll('[data-bgrbg]').forEach((btn) => {
    btn.addEventListener('click', () => {
      bgRemoverState.bgPreviewMode = btn.dataset.bgrbg;
      document.querySelectorAll('[data-bgrbg]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _drawPreviewToCanvas();
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash1', 0.2);
    });
  });

  // Action: Download Button
  const btnDownload = document.getElementById('btnBgRemoverDownload');
  if (btnDownload) {
    btnDownload.addEventListener('click', (e) => {
      downloadTransparentPNG(e);
    });
  }

  // Action: Save to Assets
  const btnSaveAssets = document.getElementById('btnBgRemoverSaveAssets');
  if (btnSaveAssets) {
    btnSaveAssets.addEventListener('click', () => {
      saveTransparentPNGToAssets();
    });
  }

  // Action: Copy PNG to Clipboard
  const btnCopy = document.getElementById('btnBgRemoverCopy');
  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      copyTransparentPNGToClipboard();
    });
  }

  // Action: Open Folder
  const btnFolder = document.getElementById('btnBgRemoverOpenFolder');
  if (btnFolder) {
    btnFolder.addEventListener('click', () => {
      if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.openDownloadsFolder === 'function') {
        window.electronAPI.openDownloadsFolder();
      } else {
        _showToast('📁 Files save to your Downloads folder');
      }
    });
  }

  // Sample Preset Loader button
  const btnSample = document.getElementById('btnBgRemoverSample');
  if (btnSample) {
    btnSample.addEventListener('click', () => {
      _loadDefaultSampleSprite();
    });
  }
}

/**
 * Opens native File Manager or file picker to select an image
 * Synchronous direct trigger guarantees zero security gesture blocks
 */
export function openImageFromFileManager() {
  const fileInput = document.getElementById('bgRemoverFileInput');
  if (fileInput) {
    fileInput.value = '';
    fileInput.click();
  }
}

/**
 * Loads an image from a URL or asset path
 */
export function _loadImageFromUrl(url, fileName) {
  bgRemoverState.sourceFileName = (fileName || 'imported-image.png').replace(/\.[^/.]+$/, '') + '-transparent.png';
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    bgRemoverState.sourceImage = img;
    _autoDetectCornerColor();
    processAndRenderImage();
    _showToast(`📷 LOADED: ${fileName || 'image.png'}`);
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash5', 0.35);
  };
  img.onerror = () => {
    _showToast(`⚠️ Could not load image: ${fileName || url}`);
  };
  img.src = url;
}


/**
 * Loads an image from a Data URL string
 */
function _loadImageFromDataUrl(dataUrl, fileName) {
  bgRemoverState.sourceFileName = (fileName || 'imported-image.png').replace(/\.[^/.]+$/, '') + '-transparent.png';
  const img = new Image();
  img.onload = () => {
    bgRemoverState.sourceImage = img;
    _autoDetectCornerColor();
    processAndRenderImage();
    _showToast(`📷 LOADED: ${fileName || 'image.png'}`);
    if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash5', 0.35);
  };
  img.src = dataUrl;
}

/**
 * Validates whether a file is a valid image format (handles empty Windows MIME types)
 */
function _isValidImageFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith('image/')) return true;
  const name = (file.name || '').toLowerCase();
  return /\.(png|jpe?g|webp|bmp|gif|ico|svg|tiff?)$/i.test(name);
}

/**
 * Loads an image from a user File object with dual URL.createObjectURL and FileReader fallback
 */
function _loadImageFromFile(file) {
  if (!_isValidImageFile(file)) {
    _showToast('⚠️ Please select a valid image file (PNG, JPG, WebP, BMP).');
    return;
  }

  bgRemoverState.sourceFileName = (file.name || 'imported-sprite.png').replace(/\.[^/.]+$/, '') + '-transparent.png';

  // Strategy 1: URL.createObjectURL (instant, zero-copy memory pointer)
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    try {
      const blobUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        bgRemoverState.sourceImage = img;
        _autoDetectCornerColor();
        processAndRenderImage();
        _showToast(`📷 LOADED: ${file.name || 'image.png'}`);
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash5', 0.35);
        try { URL.revokeObjectURL(blobUrl); } catch (e) {}
      };
      img.onerror = () => {
        _loadViaFileReader(file);
      };
      img.src = blobUrl;
      return;
    } catch (err) {
      console.warn('createObjectURL fallback:', err);
    }
  }

  // Strategy 2: FileReader DataURL
  _loadViaFileReader(file);
}

function _loadViaFileReader(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      bgRemoverState.sourceImage = img;
      _autoDetectCornerColor();
      processAndRenderImage();
      _showToast(`📷 LOADED: ${file.name}`);
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash5', 0.35);
    };
    img.onerror = () => {
      _showToast('⚠️ Could not decode image format.');
    };
    img.src = e.target.result;
  };
  reader.onerror = () => {
    _showToast('⚠️ Error reading image file.');
  };
  reader.readAsDataURL(file);
}

/**
 * Pastes an image from system clipboard
 */
async function _pasteFromClipboard() {
  try {
    if (!navigator.clipboard || !navigator.clipboard.read) {
      _showToast('⚠️ Clipboard API not supported in this browser.');
      return;
    }
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imgType = item.types.find(t => t.startsWith('image/'));
      if (imgType) {
        const blob = await item.getType(imgType);
        _loadImageFromFile(new File([blob], 'clipboard-sprite.png', { type: imgType }));
        return;
      }
    }
    _showToast('⚠️ No image found in clipboard.');
  } catch (err) {
    console.warn('Clipboard read error:', err);
    _showToast('⚠️ Clipboard permission denied or no image copied.');
  }
}

/**
 * Loads a built-in default sample sprite for instant demonstration
 */
function _loadDefaultSampleSprite() {
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 128;
  sampleCanvas.height = 128;
  const sCtx = sampleCanvas.getContext('2d');
  
  // Draw white background
  sCtx.fillStyle = '#FFFFFF';
  sCtx.fillRect(0, 0, 128, 128);

  // Draw colorful circle character
  sCtx.fillStyle = '#E11D48';
  sCtx.beginPath();
  sCtx.arc(64, 64, 38, 0, Math.PI * 2);
  sCtx.fill();
  sCtx.lineWidth = 4;
  sCtx.strokeStyle = '#0E0F14';
  sCtx.stroke();

  // Draw headband & details
  sCtx.fillStyle = '#FDE047';
  sCtx.fillRect(32, 48, 64, 14);

  const img = new Image();
  img.onload = () => {
    bgRemoverState.sourceImage = img;
    bgRemoverState.sourceFileName = 'sample-character-transparent.png';
    _autoDetectCornerColor();
    processAndRenderImage();
    _showToast('✨ Sample sprite loaded!');
  };
  img.src = sampleCanvas.toDataURL('image/png');
}

/**
 * Samples color at pixel coordinate (x, y) from source image
 */
function _sampleColorFromSource(x, y) {
  if (!bgRemoverState.sourceImage) return;
  try {
    const img = bgRemoverState.sourceImage;
    const w = img.naturalWidth || img.width || 128;
    const h = img.naturalHeight || img.height || 128;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(img, 0, 0);

    const clappedX = Math.max(0, Math.min(w - 1, x));
    const clappedY = Math.max(0, Math.min(h - 1, y));
    const pixel = tCtx.getImageData(clappedX, clappedY, 1, 1).data;

    bgRemoverState.targetColor = { r: pixel[0], g: pixel[1], b: pixel[2] };
    bgRemoverState.targetColorHex = _rgbToHex(pixel[0], pixel[1], pixel[2]);

    const colorInput = document.getElementById('bgRemoverColorInput');
    if (colorInput) colorInput.value = bgRemoverState.targetColorHex;
    const colorSwatch = document.getElementById('bgRemoverColorSwatch');
    if (colorSwatch) colorSwatch.style.backgroundColor = bgRemoverState.targetColorHex;
    const colorLabel = document.getElementById('bgRemoverColorLabel');
    if (colorLabel) colorLabel.innerText = bgRemoverState.targetColorHex.toUpperCase();
  } catch (err) {
    console.warn('_sampleColorFromSource error:', err);
  }
}

/**
 * Automatically inspects the 4 corner pixels of the image to pick the dominant background tone
 */
function _autoDetectCornerColor() {
  if (!bgRemoverState.sourceImage) return;
  try {
    const img = bgRemoverState.sourceImage;
    const w = img.naturalWidth || img.width || 128;
    const h = img.naturalHeight || img.height || 128;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.drawImage(img, 0, 0);

    const corners = [
      tCtx.getImageData(0, 0, 1, 1).data,
      tCtx.getImageData(Math.max(0, w - 1), 0, 1, 1).data,
      tCtx.getImageData(0, Math.max(0, h - 1), 1, 1).data,
      tCtx.getImageData(Math.max(0, w - 1), Math.max(0, h - 1), 1, 1).data
    ];

    // Average corner RGB values
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < 4; i++) {
      r += corners[i][0];
      g += corners[i][1];
      b += corners[i][2];
    }
    r = Math.round(r / 4);
    g = Math.round(g / 4);
    b = Math.round(b / 4);

    bgRemoverState.targetColor = { r, g, b };
    bgRemoverState.targetColorHex = _rgbToHex(r, g, b);

    const colorInput = document.getElementById('bgRemoverColorInput');
    if (colorInput) colorInput.value = bgRemoverState.targetColorHex;
    const colorSwatch = document.getElementById('bgRemoverColorSwatch');
    if (colorSwatch) colorSwatch.style.backgroundColor = bgRemoverState.targetColorHex;
    const colorLabel = document.getElementById('bgRemoverColorLabel');
    if (colorLabel) colorLabel.innerText = bgRemoverState.targetColorHex.toUpperCase();
  } catch (err) {
    console.warn('_autoDetectCornerColor error:', err);
  }
}

function _setTargetColorFromHex(hex) {
  bgRemoverState.targetColorHex = hex;
  const num = parseInt(hex.replace('#', ''), 16);
  bgRemoverState.targetColor = {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
  const colorSwatch = document.getElementById('bgRemoverColorSwatch');
  if (colorSwatch) colorSwatch.style.backgroundColor = hex;
  const colorLabel = document.getElementById('bgRemoverColorLabel');
  if (colorLabel) colorLabel.innerText = hex.toUpperCase();
}

function _rgbToHex(r, g, b) {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Core Background Removal Algorithm — processes pixel buffer and applies Chroma Key cutout
 */
export function processAndRenderImage() {
  if (!bgRemoverState.sourceImage) {
    _drawEmptyPlaceholder();
    return;
  }

  const img = bgRemoverState.sourceImage;
  const w = img.naturalWidth || img.width || 128;
  const h = img.naturalHeight || img.height || 128;

  const procCanvas = document.createElement('canvas');
  procCanvas.width = w;
  procCanvas.height = h;
  const pCtx = procCanvas.getContext('2d', { alpha: true });
  pCtx.drawImage(img, 0, 0);

  const imgData = pCtx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const tr = bgRemoverState.targetColor.r;
  const tg = bgRemoverState.targetColor.g;
  const tb = bgRemoverState.targetColor.b;

  const maxThreshold = (bgRemoverState.tolerance / 100) * 441.67; // Euclidean max = sqrt(255^2*3)
  const featherRange = bgRemoverState.feather * 12.0;

  if (bgRemoverState.mode === 'contiguous') {
    // ── FLOOD FILL / BFS ALGORITHM FROM ALL 4 OUTER BOUNDARIES ──
    const visited = new Uint8Array(w * h);
    const queueX = new Int32Array(w * h);
    const queueY = new Int32Array(w * h);
    let head = 0;
    let tail = 0;

    const pushQueue = (x, y) => {
      const idx = y * w + x;
      if (visited[idx]) return;
      visited[idx] = 1;

      const pIdx = idx * 4;
      const r = data[pIdx];
      const g = data[pIdx + 1];
      const b = data[pIdx + 2];
      const dist = Math.hypot(r - tr, g - tg, b - tb);

      if (dist <= maxThreshold) {
        queueX[tail] = x;
        queueY[tail] = y;
        tail++;

        if (featherRange > 0 && dist > maxThreshold - featherRange) {
          const ratio = (dist - (maxThreshold - featherRange)) / featherRange;
          data[pIdx + 3] = Math.round(255 * ratio);
        } else {
          data[pIdx + 3] = 0; // Transparent!
        }
      }
    };

    // Seed outer boundary pixels
    for (let x = 0; x < w; x++) {
      pushQueue(x, 0);
      pushQueue(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      pushQueue(0, y);
      pushQueue(w - 1, y);
    }

    // BFS Expansion
    while (head < tail) {
      const cx = queueX[head];
      const cy = queueY[head];
      head++;

      if (cx > 0) pushQueue(cx - 1, cy);
      if (cx < w - 1) pushQueue(cx + 1, cy);
      if (cy > 0) pushQueue(cx, cy - 1);
      if (cy < h - 1) pushQueue(cx, cy + 1);
    }
  } else {
    // ── GLOBAL ALL-COLOR MATCHING MODE ──
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const dist = Math.hypot(r - tr, g - tg, b - tb);

      if (dist <= maxThreshold) {
        if (featherRange > 0 && dist > maxThreshold - featherRange) {
          const ratio = (dist - (maxThreshold - featherRange)) / featherRange;
          data[i + 3] = Math.round(255 * ratio);
        } else {
          data[i + 3] = 0; // Transparent!
        }
      }
    }
  }

  pCtx.putImageData(imgData, 0, 0);

  // ── AUTO-CROP MARGINS (IF ENABLED) ──
  if (bgRemoverState.autoCrop) {
    _cachedProcessedCanvas = _cropTransparentBounds(procCanvas, pCtx, w, h);
  } else {
    _cachedProcessedCanvas = procCanvas;
  }

  _drawPreviewToCanvas();
  _syncDownloadButton();
}

/**
 * Trims excess outer transparent pixels to fit the content bounding box
 */
function _cropTransparentBounds(sourceCanvas, ctx, w, h) {
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  let minX = w, maxX = 0, minY = h, maxY = 0;
  let hasPixels = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > 5) {
        hasPixels = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!hasPixels) return sourceCanvas;

  const cropW = Math.max(1, maxX - minX + 1);
  const cropH = Math.max(1, maxY - minY + 1);

  const cropped = document.createElement('canvas');
  cropped.width = cropW;
  cropped.height = cropH;
  const cCtx = cropped.getContext('2d', { alpha: true });
  cCtx.drawImage(sourceCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  return cropped;
}

/**
 * Draws the processed transparent image onto preview canvas with user-selected background
 */
function _drawPreviewToCanvas() {
  const canvas = document.getElementById('bgRemoverPreviewCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  // Background Pattern
  if (bgRemoverState.bgPreviewMode === 'dark') {
    ctx.fillStyle = '#18181B';
    ctx.fillRect(0, 0, w, h);
  } else if (bgRemoverState.bgPreviewMode === 'black') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
  } else if (bgRemoverState.bgPreviewMode === 'white') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
  } else {
    // Transparency Checkerboard Pattern
    const gridSize = 12;
    for (let y = 0; y < h; y += gridSize) {
      for (let x = 0; x < w; x += gridSize) {
        ctx.fillStyle = ((Math.floor(x / gridSize) + Math.floor(y / gridSize)) % 2 === 0) ? '#334155' : '#1E293B';
        ctx.fillRect(x, y, gridSize, gridSize);
      }
    }
  }

  if (!_cachedProcessedCanvas) {
    _drawEmptyPlaceholder();
    return;
  }

  // Draw scaled & aspect-ratio centered
  const srcW = _cachedProcessedCanvas.width;
  const srcH = _cachedProcessedCanvas.height;
  const scale = Math.min((w - 24) / srcW, (h - 24) / srcH);
  const destW = Math.round(srcW * scale);
  const destH = Math.round(srcH * scale);
  const destX = Math.round((w - destW) / 2);
  const destY = Math.round((h - destH) / 2);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(_cachedProcessedCanvas, destX, destY, destW, destH);

  // Update dimension label
  const dimLabel = document.getElementById('bgRemoverDimLabel');
  if (dimLabel) dimLabel.innerText = `${srcW} x ${srcH} PX`;
}

function _drawEmptyPlaceholder() {
  const canvas = document.getElementById('bgRemoverPreviewCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#090D16';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#38BDF8';
  ctx.font = '700 13px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NO IMAGE LOADED', w / 2, h / 2 - 10);

  ctx.font = '600 10.5px "Rajdhani", sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.fillText('Click Browse, Drag & Drop, or Quick Load a Character', w / 2, h / 2 + 12);
}

function _syncDownloadButton() {
  const btnDownload = document.getElementById('btnBgRemoverDownload');
  if (btnDownload && _cachedProcessedCanvas) {
    const dataUrl = _cachedProcessedCanvas.toDataURL('image/png');
    btnDownload.href = dataUrl;
    btnDownload.download = bgRemoverState.sourceFileName;
    btnDownload.setAttribute('download', bgRemoverState.sourceFileName);
  }
}

/**
 * Downloads transparent PNG directly
 */
export async function downloadTransparentPNG(e) {
  if (!_cachedProcessedCanvas) {
    _showToast('⚠️ Please load an image first.');
    return;
  }

  const fileName = bgRemoverState.sourceFileName || 'transparent-sprite.png';
  const dataUrl = _cachedProcessedCanvas.toDataURL('image/png');

  // Electron Save As Dialog
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.showSaveImageDialog === 'function') {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const result = await window.electronAPI.showSaveImageDialog({
        defaultName: fileName,
        base64Data: dataUrl
      });
      if (result && result.success) {
        _showToast(`💾 SAVED: ${fileName}`);
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash5', 0.35);
        return;
      } else if (result && result.canceled) {
        return;
      }
    } catch (err) {
      console.warn('Electron save dialog error:', err);
    }
  }

  // Modern Browser File System Access API
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
      _showToast(`💾 SAVED: ${fileName}`);
      if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash5', 0.35);
      return;
    } catch (pickErr) {
      if (pickErr.name === 'AbortError') return;
      console.warn('showSaveFilePicker fallback:', pickErr);
    }
  }

  // Standard Native Link Download
  const btnDownload = document.getElementById('btnBgRemoverDownload');
  if (btnDownload) {
    btnDownload.href = dataUrl;
    btnDownload.download = fileName;
    btnDownload.setAttribute('download', fileName);
  }

  _showToast(`💾 SAVED: ${fileName}`);
  if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash5', 0.35);
}

/**
 * Saves transparent PNG directly into game's Assets/model/ directory
 */
export async function saveTransparentPNGToAssets() {
  if (!_cachedProcessedCanvas) {
    _showToast('⚠️ Please load an image first.');
    return;
  }

  const fileName = bgRemoverState.sourceFileName || 'custom-model.png';
  const dataUrl = _cachedProcessedCanvas.toDataURL('image/png');

  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.saveToAssetsModel === 'function') {
    try {
      const res = await window.electronAPI.saveToAssetsModel({ fileName, base64Data: dataUrl });
      if (res && res.success) {
        _showToast(`📥 SAVED TO Assets/model/${fileName}!`);
        if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash5', 0.35);
        return;
      }
    } catch (err) {
      console.error('Save to assets error:', err);
    }
  }

  // Fallback to standard download
  downloadTransparentPNG();
}

/**
 * Copies transparent PNG directly to OS clipboard
 */
export async function copyTransparentPNGToClipboard() {
  if (!_cachedProcessedCanvas) {
    _showToast('⚠️ Please load an image first.');
    return;
  }

  try {
    if (navigator.clipboard && window.ClipboardItem && _cachedProcessedCanvas.toBlob) {
      _cachedProcessedCanvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          _showToast(`📋 TRANSPARENT PNG COPIED TO CLIPBOARD!`);
          if (typeof audioSystem !== 'undefined' && audioSystem.playSFX) audioSystem.playSFX('skill_dash5', 0.35);
        } catch (clipErr) {
          console.warn('Clipboard write error:', clipErr);
          _showToast(`⚠️ Clipboard permission denied.`);
        }
      }, 'image/png');
    } else {
      _showToast(`⚠️ Clipboard image copy not supported.`);
    }
  } catch (err) {
    console.error('Clipboard copy error:', err);
    _showToast(`⚠️ Clipboard copy error.`);
  }
}

function _showToast(msg) {
  const toast = document.getElementById('bgRemoverToast');
  if (toast) {
    toast.innerText = msg;
    toast.classList.add('active');
    if (toast._timer) clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('active'), 3400);
  }
}

if (typeof window !== 'undefined') {
  window.initImageBgRemoverUI = initImageBgRemoverUI;
  window.openImageFromFileManager = openImageFromFileManager;
  window.processAndRenderImage = processAndRenderImage;
  window.downloadTransparentPNG = downloadTransparentPNG;
  window.saveTransparentPNGToAssets = saveTransparentPNGToAssets;
  window.copyTransparentPNGToClipboard = copyTransparentPNGToClipboard;
}
