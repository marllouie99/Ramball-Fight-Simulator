// ─────────────────────────────────────────────
// ARENA BGM SYSTEM — Interactive Soundtrack Manager & Auto-Sync Engine
// ─────────────────────────────────────────────

import { state } from '../core/state.js';
import { playLoopingSound, stopLoopingSound, setLoopingSoundVolume } from './soundSystem.js';
import { _registerButton, drawChamferedRect } from '../graphics/ui/uiFramework.js';

export const ARENA_BGM_LOOP_KEY = 'arena_bgm_loop';
export const ARENA_BGM_PREVIEW_KEY = 'arena_bgm_preview';

export const ARENA_BGM_TRACKS = [
  {
    id: 'random',
    name: 'RANDOM',
    shortName: 'RANDOM',
    label: 'RANDOM TRACK',
    src: null
  },
  {
    id: 'guile',
    name: 'GUILE STAGE',
    shortName: 'GUILE',
    label: 'GUILE STAGE',
    src: 'Assets/Sound Effects/ARENA-BGMUSIC/Street Fighter II Arcade Music - Guile Stage - CPS1.mp3'
  },
  {
    id: 'bison',
    name: 'M. BISON',
    shortName: 'M. BISON',
    label: 'M. BISON STAGE',
    src: 'Assets/Sound Effects/ARENA-BGMUSIC/Street Fighter II Arcade Music - M Bison Stage - CPS1.mp3'
  },
  {
    id: 'ryu',
    name: 'RYU STAGE',
    shortName: 'RYU',
    label: 'RYU STAGE',
    src: 'Assets/Sound Effects/ARENA-BGMUSIC/Street Fighter II Arcade Music - Ryu Stage - CPS1.mp3'
  },
  {
    id: 'off',
    name: 'MUSIC: OFF',
    shortName: 'OFF',
    label: 'MUSIC DISABLED',
    src: null
  }
];

const BASE_BGM_VOLUME = 0.40;
let _arenaBgmVolume = null;
let _lastUnmutedVolume = 0.50;
let _isArenaBgmPlaying = false;
let _isDucked = false;
let _currentTrackSrc = null;
let _lastPlayedTrackSrc = null;
let _selectedTrackId = null;
let _previewTrackId = null;
let _isArenaBgmModalOpen = false;
let _modalScrollY = 0;
let _hasInitializedSync = false;
let _volumeSliderBounds = { x: 0, y: 0, w: 0, h: 0 };
let _isDraggingVolumeSlider = false;
let _lastModalMouseX = 0;
let _lastModalMouseY = 0;

export function getArenaBgmVolume() {
  if (_arenaBgmVolume !== null) return _arenaBgmVolume;
  try {
    const saved = localStorage.getItem('circle_arena_bgm_volume');
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1.0) {
        _arenaBgmVolume = parsed;
        if (parsed > 0) _lastUnmutedVolume = parsed;
        return _arenaBgmVolume;
      }
    }
  } catch (e) {}
  _arenaBgmVolume = 0.40; // Default 40%
  return _arenaBgmVolume;
}

export function setArenaBgmVolume(val) {
  const clamped = Math.max(0.0, Math.min(1.0, Math.round(val * 100) / 100));
  _arenaBgmVolume = clamped;
  if (clamped > 0) _lastUnmutedVolume = clamped;
  try {
    localStorage.setItem('circle_arena_bgm_volume', clamped.toString());
  } catch (e) {}

  if (_isArenaBgmPlaying && !_isDucked) {
    setLoopingSoundVolume(ARENA_BGM_LOOP_KEY, clamped, 100);
  }
  if (_previewTrackId) {
    setLoopingSoundVolume(ARENA_BGM_PREVIEW_KEY, clamped, 100);
  }
  return clamped;
}

export function toggleArenaBgmMute() {
  const cur = getArenaBgmVolume();
  if (cur > 0.001) {
    _lastUnmutedVolume = cur;
    return setArenaBgmVolume(0.0);
  } else {
    return setArenaBgmVolume(_lastUnmutedVolume || 0.40);
  }
}

// ─────────────────────────────────────────────
// AUTO-NAMING & FORMATTING HELPERS
// ─────────────────────────────────────────────

export function formatTrackNameFromFilename(filename) {
  let clean = filename.replace(/\.(mp3|wav|ogg|m4a|aac)$/i, '');
  clean = clean.replace(/Street Fighter II Arcade Music\s*-\s*/i, '');
  clean = clean.replace(/\s*-\s*CPS1/i, '');
  clean = clean.replace(/_/g, ' ').replace(/-/g, ' - ').replace(/\s+/g, ' ').trim();
  return clean.toUpperCase();
}

export function formatShortNameFromFilename(filename) {
  let name = formatTrackNameFromFilename(filename);
  if (name.includes('STAGE')) {
    name = name.replace(/\s*STAGE/i, '');
  }
  return name.slice(0, 14).trim();
}

// ─────────────────────────────────────────────
// INDEXEDDB PERSISTENT STORAGE (BROWSER IMPORT)
// ─────────────────────────────────────────────

const DB_NAME = 'RamballArenaBgmDB';
const STORE_NAME = 'custom_tracks';

function openBgmDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return resolve(null);
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveCustomTrackToDB(track, blob) {
  try {
    const db = await openBgmDatabase();
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({
        id: track.id,
        name: track.name,
        shortName: track.shortName,
        label: track.label,
        filename: track.filename,
        blob: blob
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save track to IndexedDB:', err);
  }
}

export async function loadCustomTracksFromDB() {
  try {
    const db = await openBgmDatabase();
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = req.result || [];
        const customTracks = records.map(r => {
          const blobUrl = URL.createObjectURL(r.blob);
          return {
            id: r.id,
            name: r.name,
            shortName: r.shortName,
            label: r.label,
            src: blobUrl,
            isCustom: true
          };
        });
        resolve(customTracks);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to load custom tracks from IndexedDB:', err);
    return [];
  }
}

export async function deleteCustomTrackFromDB(trackId) {
  try {
    const db = await openBgmDatabase();
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(trackId);
      tx.oncomplete = () => {
        const idx = ARENA_BGM_TRACKS.findIndex(t => t.id === trackId);
        if (idx !== -1) {
          ARENA_BGM_TRACKS.splice(idx, 1);
        }
        if (getSavedArenaBgmId() === trackId) {
          setSavedArenaBgmId('random');
        }
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to delete custom track:', err);
  }
}

// ─────────────────────────────────────────────
// AUTOMATIC DIRECTORY & MANIFEST SYNC
// ─────────────────────────────────────────────

/**
 * Synchronizes and auto-discovers all songs in Assets/Sound Effects/ARENA-BGMUSIC/
 * or loaded from Electron and IndexedDB.
 */
export async function syncArenaBgmTracks() {
  let diskFiles = [];

  // 1. Electron Native Auto-Scan (if running in desktop Electron)
  if (typeof window !== 'undefined' && window.electronAPI?.scanBgmFolder) {
    try {
      diskFiles = await window.electronAPI.scanBgmFolder();
    } catch (e) {
      console.warn('Electron scan failed:', e);
    }
  }

  // 2. Fetch manifest.json fallback (if running in standard browser/live-server)
  if (!diskFiles || diskFiles.length === 0) {
    try {
      const res = await fetch('Assets/Sound Effects/ARENA-BGMUSIC/manifest.json?t=' + Date.now());
      if (res.ok) {
        diskFiles = await res.json();
      }
    } catch (e) {}
  }

  // 3. Load custom imported songs from IndexedDB
  const customTracks = await loadCustomTracksFromDB();

  // 4. Merge all discovered disk files into ARENA_BGM_TRACKS
  if (Array.isArray(diskFiles) && diskFiles.length > 0) {
    diskFiles.forEach(file => {
      const srcPath = `Assets/Sound Effects/ARENA-BGMUSIC/${file}`;
      const cleanId = file.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const alreadyExists = ARENA_BGM_TRACKS.some(t => t.src === srcPath || t.id === cleanId);
      if (!alreadyExists) {
        const offIndex = ARENA_BGM_TRACKS.findIndex(t => t.id === 'off');
        const newTrack = {
          id: cleanId,
          name: formatTrackNameFromFilename(file),
          shortName: formatShortNameFromFilename(file),
          label: formatTrackNameFromFilename(file),
          src: srcPath,
          filename: file,
          isCustom: false
        };
        if (offIndex !== -1) {
          ARENA_BGM_TRACKS.splice(offIndex, 0, newTrack);
        } else {
          ARENA_BGM_TRACKS.push(newTrack);
        }
      }
    });
  }

  // 5. Merge custom imported tracks
  customTracks.forEach(ct => {
    const alreadyExists = ARENA_BGM_TRACKS.some(t => t.id === ct.id);
    if (!alreadyExists) {
      const offIndex = ARENA_BGM_TRACKS.findIndex(t => t.id === 'off');
      if (offIndex !== -1) {
        ARENA_BGM_TRACKS.splice(offIndex, 0, ct);
      } else {
        ARENA_BGM_TRACKS.push(ct);
      }
    }
  });
}

// Automatically sync tracks at startup
if (typeof window !== 'undefined') {
  syncArenaBgmTracks();
  initBgmFileInputAndDragDrop();
}

/**
 * Imports audio files (File objects from input or drag-and-drop),
 * saves them to IndexedDB, and dynamically registers them as playable tracks.
 */
export async function importCustomAudioFiles(files) {
  for (const file of files) {
    const trackId = 'custom_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const cleanName = formatTrackNameFromFilename(file.name);
    const cleanShort = formatShortNameFromFilename(file.name);
    const blobUrl = URL.createObjectURL(file);

    const track = {
      id: trackId,
      name: cleanName,
      shortName: cleanShort,
      label: cleanName,
      src: blobUrl,
      isCustom: true,
      filename: file.name
    };

    await saveCustomTrackToDB(track, file);

    const offIndex = ARENA_BGM_TRACKS.findIndex(t => t.id === 'off');
    if (offIndex !== -1) {
      ARENA_BGM_TRACKS.splice(offIndex, 0, track);
    } else {
      ARENA_BGM_TRACKS.push(track);
    }
  }

  if (typeof state !== 'undefined' && state.audioSystem?.playSFX) {
    state.audioSystem.playSFX('skill_dash1', 0.3);
  }
}

function initBgmFileInputAndDragDrop() {
  if (typeof document === 'undefined') return;

  // 1. File Input element for "Import MP3" button
  let fileInput = document.getElementById('bgm-custom-file-input');
  if (!fileInput) {
    fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'bgm-custom-file-input';
    fileInput.accept = 'audio/*, .mp3, .wav, .ogg, .m4a';
    fileInput.multiple = true;
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    fileInput.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        await importCustomAudioFiles(files);
      }
      fileInput.value = '';
    });
  }

  // 2. Drag and Drop Listener on Window
  window.addEventListener('dragover', (e) => {
    if (_isArenaBgmModalOpen) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  });

  window.addEventListener('drop', async (e) => {
    if (_isArenaBgmModalOpen) {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files || []).filter(f => /\.(mp3|wav|ogg|m4a)$/i.test(f.name) || f.type.startsWith('audio/'));
      if (files.length > 0) {
        await importCustomAudioFiles(files);
      }
    }
  });

  // 3. Mouse Wheel Scrolling inside Modal
  window.addEventListener('wheel', (e) => {
    if (_isArenaBgmModalOpen) {
      _modalScrollY += e.deltaY * 0.6;
    }
  }, { passive: true });

  // 4. Mouse Tracking & Slider Drag Listeners
  window.addEventListener('mousemove', (e) => {
    if (typeof state !== 'undefined' && state.canvas) {
      const rect = state.canvas.getBoundingClientRect();
      const scaleX = state.canvas.width / rect.width;
      const scaleY = state.canvas.height / rect.height;
      _lastModalMouseX = (e.clientX - rect.left) * scaleX;
      _lastModalMouseY = (e.clientY - rect.top) * scaleY;
    }
    if (_isDraggingVolumeSlider && _isArenaBgmModalOpen && _volumeSliderBounds.w > 0) {
      const ratio = Math.max(0, Math.min(1, (_lastModalMouseX - _volumeSliderBounds.x) / _volumeSliderBounds.w));
      setArenaBgmVolume(ratio);
    }
  });

  window.addEventListener('mousedown', (e) => {
    if (_isArenaBgmModalOpen && typeof state !== 'undefined' && state.canvas) {
      const rect = state.canvas.getBoundingClientRect();
      const scaleX = state.canvas.width / rect.width;
      const scaleY = state.canvas.height / rect.height;
      const mouseX = (e.clientX - rect.left) * scaleX;
      const mouseY = (e.clientY - rect.top) * scaleY;

      if (_volumeSliderBounds.w > 0 &&
          mouseX >= _volumeSliderBounds.x - 8 && mouseX <= _volumeSliderBounds.x + _volumeSliderBounds.w + 8 &&
          mouseY >= _volumeSliderBounds.y - 4 && mouseY <= _volumeSliderBounds.y + _volumeSliderBounds.h + 4) {
        _isDraggingVolumeSlider = true;
        const ratio = Math.max(0, Math.min(1, (mouseX - _volumeSliderBounds.x) / _volumeSliderBounds.w));
        setArenaBgmVolume(ratio);
      }
    }
  });

  window.addEventListener('mouseup', () => {
    _isDraggingVolumeSlider = false;
  });
}

// ─────────────────────────────────────────────
// SOUNDTRACK SELECTION & PERSISTENCE
// ─────────────────────────────────────────────

export function getSavedArenaBgmId() {
  if (_selectedTrackId) return _selectedTrackId;
  try {
    const saved = localStorage.getItem('circle_arena_bgm_track');
    if (saved && ARENA_BGM_TRACKS.some(t => t.id === saved)) {
      _selectedTrackId = saved;
      return saved;
    }
  } catch (e) {}
  _selectedTrackId = 'random';
  return 'random';
}

export function setSavedArenaBgmId(trackId) {
  _selectedTrackId = trackId;
  try {
    localStorage.setItem('circle_arena_bgm_track', trackId);
  } catch (e) {}
}

export function cycleNextArenaBgmTrack() {
  const currentId = getSavedArenaBgmId();
  const currentIndex = ARENA_BGM_TRACKS.findIndex(t => t.id === currentId);
  const nextIndex = (currentIndex + 1) % ARENA_BGM_TRACKS.length;
  const nextTrack = ARENA_BGM_TRACKS[nextIndex];
  setSavedArenaBgmId(nextTrack.id);
  return nextTrack;
}

export function getSelectedArenaBgmTrack() {
  const currentId = getSavedArenaBgmId();
  return ARENA_BGM_TRACKS.find(t => t.id === currentId) || ARENA_BGM_TRACKS[0];
}

export function getCurrentPlayingBgmTitle() {
  const trackId = getSavedArenaBgmId();
  if (trackId === 'off') return null;

  // If a track is actively playing or was played in the active/current match, resolve the real name
  const trackSrc = _currentTrackSrc || _lastPlayedTrackSrc;
  if (trackSrc) {
    // 1. Try matching from the track registry (handles custom tracks with blob URLs too)
    const matched = ARENA_BGM_TRACKS.find(t => t.src === trackSrc);
    if (matched) {
      // For custom tracks, prefer the stored filename over the formatted name
      if (matched.filename) {
        return `🎵 ${formatTrackNameFromFilename(matched.filename)}`;
      }
      if (matched.name && matched.name !== 'RANDOM' && matched.name !== 'MUSIC: OFF') {
        return `🎵 ${matched.name}`;
      }
    }

    // 2. Fallback: extract the filename directly from the src path
    if (trackSrc && !trackSrc.startsWith('blob:')) {
      const parts = decodeURIComponent(trackSrc).split('/');
      const fileName = parts[parts.length - 1];
      if (fileName) {
        return `🎵 ${formatTrackNameFromFilename(fileName)}`;
      }
    }
  }

  // 3. No track actively playing yet — show the selected track's name
  const selected = getSelectedArenaBgmTrack();
  if (selected && selected.id !== 'off') {
    if (selected.id === 'random') {
      return `🎵 BGM: RANDOM`;
    }
    if (selected.filename) {
      return `🎵 ${formatTrackNameFromFilename(selected.filename)}`;
    }
    return `🎵 ${selected.name}`;
  }
  return null;
}

export function shouldDuckArenaBgm() {
  if (typeof state === 'undefined' || !state.fighters) return false;

  if (Boolean(state.missionPassedOverlay && state.missionPassedOverlay.active && state.missionPassedOverlay.timer > 0) ||
      Boolean(state.wastedOverlay && state.wastedOverlay.active && state.wastedOverlay.timer > 0)) {
    return true;
  }

  for (let i = 0; i < state.fighters.length; i++) {
    const f = state.fighters[i];
    if (!f || f.hp <= 0) continue;

    if (f.isTakadaBackgroundPlaying || f.isTakadaChanneling) {
      return true;
    }
    if (f.isChannelingPureLoveBeam && f.pureLoveBeamSoundHandle) {
      return true;
    }
  }

  return false;
}

export function startArenaBgm(forceNew = false) {
  const trackId = getSavedArenaBgmId();
  if (trackId === 'off') {
    stopArenaBgm(true);
    return;
  }

  let chosenSrc = null;
  if (trackId === 'random') {
    const validTracks = ARENA_BGM_TRACKS.filter(t => t.src !== null);
    const randTrack = validTracks[Math.floor(Math.random() * validTracks.length)];
    chosenSrc = randTrack?.src;
  } else {
    const track = ARENA_BGM_TRACKS.find(t => t.id === trackId);
    chosenSrc = track ? track.src : null;
  }

  stopPreview();
  stopLoopingSound(ARENA_BGM_LOOP_KEY);

  _currentTrackSrc = chosenSrc;
  _lastPlayedTrackSrc = chosenSrc;
  _isArenaBgmPlaying = true;
  _isDucked = false;

  if (chosenSrc) {
    playLoopingSound(ARENA_BGM_LOOP_KEY, chosenSrc, getArenaBgmVolume(), 1.0, 350);
  }
}

export function stopArenaBgm(instant = true) {
  _isArenaBgmPlaying = false;
  _isDucked = false;
  _currentTrackSrc = null;
  stopLoopingSound(ARENA_BGM_LOOP_KEY);
}

export function updateArenaBgm() {
  if (typeof state === 'undefined') return;

  if (state.gameState === 'matchEnd' || state.gameState === 'roundEnd') {
    if (_isArenaBgmPlaying) {
      stopArenaBgm(true);
      return;
    }
  }

  const needsDuck = shouldDuckArenaBgm();

  if (needsDuck && !_isDucked) {
    _isDucked = true;
    setLoopingSoundVolume(ARENA_BGM_LOOP_KEY, 0.0001, 700);
  } else if (!needsDuck && _isDucked) {
    _isDucked = false;
    setLoopingSoundVolume(ARENA_BGM_LOOP_KEY, getArenaBgmVolume(), 1200);
  }
}

// ─────────────────────────────────────────────
// PREVIEW AUDITION CONTROLS
// ─────────────────────────────────────────────

export function isPreviewingTrack(trackId) {
  return _previewTrackId === trackId;
}

export function previewTrack(trackId) {
  if (_previewTrackId === trackId) {
    stopPreview();
    return;
  }

  stopPreview();

  if (trackId === 'off') {
    return;
  }

  let srcToPlay = null;
  if (trackId === 'random') {
    const validTracks = ARENA_BGM_TRACKS.filter(t => t.src !== null);
    const randTrack = validTracks[Math.floor(Math.random() * validTracks.length)];
    srcToPlay = randTrack?.src;
  } else {
    const track = ARENA_BGM_TRACKS.find(t => t.id === trackId);
    srcToPlay = track ? track.src : null;
  }

  if (srcToPlay) {
    _previewTrackId = trackId;
    playLoopingSound(ARENA_BGM_PREVIEW_KEY, srcToPlay, getArenaBgmVolume(), 1.0, 150);
  }
}

export function stopPreview() {
  if (_previewTrackId) {
    stopLoopingSound(ARENA_BGM_PREVIEW_KEY);
    _previewTrackId = null;
  }
}

export function isArenaBgmModalOpen() {
  return _isArenaBgmModalOpen;
}

export function openArenaBgmModal() {
  _isArenaBgmModalOpen = true;
  _modalScrollY = 0;
  syncArenaBgmTracks();
}

export function closeArenaBgmModal() {
  stopPreview();
  _isArenaBgmModalOpen = false;
}

// ─────────────────────────────────────────────
// DRAW INTERACTIVE BGM SELECTOR & MODAL UI
// ─────────────────────────────────────────────

export function drawArenaBgmSelector(ctx, x, y, width, height) {
  const currentTrack = getSelectedArenaBgmTrack();
  const isOff = currentTrack.id === 'off';
  const isRandom = currentTrack.id === 'random';

  ctx.save();
  if (isOff) {
    ctx.fillStyle = 'rgba(18, 22, 32, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
  } else {
    ctx.fillStyle = isRandom ? 'rgba(0, 229, 255, 0.14)' : 'rgba(245, 158, 11, 0.14)';
    ctx.strokeStyle = isRandom ? '#00e5ff' : '#f59e0b';
    ctx.lineWidth = 1;
  }

  drawChamferedRect(ctx, x, y, width, height, 4);
  ctx.fill();
  ctx.stroke();

  const labelColor = isOff ? '#8899aa' : (isRandom ? '#00e5ff' : '#ffd700');
  ctx.fillStyle = labelColor;
  ctx.font = '900 10px "Rajdhani", "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const displayLabel = `🎵 BGM: ${currentTrack.shortName}`;
  ctx.fillText(displayLabel, x + width / 2, y + height / 2);

  ctx.restore();

  _registerButton(x, y, width, height, () => {
    openArenaBgmModal();
    if (typeof state !== 'undefined' && state.audioSystem?.playSFX) {
      state.audioSystem.playSFX('skill_dash1', 0.2);
    }
  });
}

export function drawArenaBgmModal(ctx) {
  const canvas = state.canvas;
  const currentTrack = getSelectedArenaBgmTrack();
  const isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI?.scanBgmFolder);

  // 1. Fullscreen Dimmed Modal Backdrop
  ctx.save();
  ctx.fillStyle = 'rgba(3, 5, 8, 0.85)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Backdrop click closes modal
  _registerButton(0, 0, canvas.width, canvas.height, () => {
    closeArenaBgmModal();
  });

  // 2. Centered Modal Window
  const modalW = Math.min(canvas.width - 24, 440);
  const modalH = 460;
  const mx = (canvas.width - modalW) / 2;
  const my = (canvas.height - modalH) / 2;

  ctx.save();
  ctx.fillStyle = 'rgba(10, 14, 22, 0.98)';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(245, 158, 11, 0.35)';
  ctx.shadowBlur = 12;
  drawChamferedRect(ctx, mx, my, modalW, modalH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Modal Header
  ctx.save();
  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 9px "Rajdhani", monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('SYS // AUDIO OPERATIONS // AUTO-SYNC ENABLED', mx + 20, my + 14);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 17px "Outfit", "Rajdhani", sans-serif';
  ctx.fillText('[ SELECT ARENA SOUNDTRACK ]', mx + 20, my + 26);

  // Close 'X' Button
  const closeBtnSize = 22;
  const closeBtnX = mx + modalW - closeBtnSize - 16;
  const closeBtnY = my + 18;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, closeBtnX, closeBtnY, closeBtnSize, closeBtnSize, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ff6b6b';
  ctx.font = '900 12px "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✕', closeBtnX + closeBtnSize / 2, closeBtnY + closeBtnSize / 2);

  _registerButton(closeBtnX, closeBtnY, closeBtnSize, closeBtnSize, () => {
    closeArenaBgmModal();
  });

  // Top Action Bar (Import / Open Folder)
  const barY = my + 48;
  const barBtnH = 20;
  
  if (isElectron) {
    // Open Folder in Windows Explorer
    const openBtnW = 122;
    const openBtnX = mx + 20;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, openBtnX, barY, openBtnW, barBtnH, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#00e5ff';
    ctx.font = '900 8.5px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📁 OPEN MUSIC FOLDER', openBtnX + openBtnW / 2, barY + barBtnH / 2);
    ctx.restore();

    _registerButton(openBtnX, barY, openBtnW, barBtnH, () => {
      window.electronAPI.openBgmFolder();
    });

    // Rescan Folder Button
    const rescanBtnW = 90;
    const rescanBtnX = openBtnX + openBtnW + 8;
    ctx.save();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, rescanBtnX, barY, rescanBtnW, barBtnH, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f59e0b';
    ctx.font = '900 8.5px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔄 RESCAN FOLDER', rescanBtnX + rescanBtnW / 2, barY + barBtnH / 2);
    ctx.restore();

    _registerButton(rescanBtnX, barY, rescanBtnW, barBtnH, () => {
      syncArenaBgmTracks();
      if (state.audioSystem?.playSFX) state.audioSystem.playSFX('skill_dash1', 0.2);
    });

    // Import MP3 from Picker Button
    const importBtnW = 100;
    const importBtnX = rescanBtnX + rescanBtnW + 8;
    ctx.save();
    ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, importBtnX, barY, importBtnW, barBtnH, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#10b981';
    ctx.font = '900 8.5px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('➕ IMPORT MP3', importBtnX + importBtnW / 2, barY + barBtnH / 2);
    ctx.restore();

    _registerButton(importBtnX, barY, importBtnW, barBtnH, () => {
      const input = document.getElementById('bgm-custom-file-input');
      if (input) input.click();
    });
  } else {
    // Standard Browser: Import MP3 & Drag Drop indicator
    const importBtnW = modalW - 40;
    const importBtnX = mx + 20;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 229, 255, 0.10)';
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 1;
    drawChamferedRect(ctx, importBtnX, barY, importBtnW, barBtnH, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#00e5ff';
    ctx.font = '900 9px "Rajdhani", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📂 CLICK TO IMPORT MP3s  /  DRAG & DROP SONGS HERE', importBtnX + importBtnW / 2, barY + barBtnH / 2);
    ctx.restore();

    _registerButton(importBtnX, barY, importBtnW, barBtnH, () => {
      const input = document.getElementById('bgm-custom-file-input');
      if (input) input.click();
    });
  }

  // ── 2B. INTERACTIVE BGM VOLUME CONTROLLER ──
  const volY = my + 74;
  const volH = 22;
  const currentVol = getArenaBgmVolume();
  const isMuted = currentVol <= 0.001;

  // 1. Mute Toggle / Volume Level Badge Button
  const muteBtnX = mx + 20;
  const muteBtnW = 76;
  ctx.save();
  if (isMuted) {
    ctx.fillStyle = 'rgba(239, 68, 68, 0.18)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.2;
  } else {
    ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1;
  }
  drawChamferedRect(ctx, muteBtnX, volY, muteBtnW, volH, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isMuted ? '#ef4444' : '#00e5ff';
  ctx.font = '900 9px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const volText = isMuted ? '🔇 MUTED' : `🔊 VOL: ${Math.round(currentVol * 100)}%`;
  ctx.fillText(volText, muteBtnX + muteBtnW / 2, volY + volH / 2);
  ctx.restore();

  _registerButton(muteBtnX, volY, muteBtnW, volH, () => {
    toggleArenaBgmMute();
    if (state.audioSystem?.playSFX) state.audioSystem.playSFX('skill_dash1', 0.2);
  });

  // 2. Minus (-5%) Step Button
  const minusBtnX = muteBtnX + muteBtnW + 6;
  const stepBtnW = 20;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, minusBtnX, volY, stepBtnW, volH, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('−', minusBtnX + stepBtnW / 2, volY + volH / 2);
  ctx.restore();

  _registerButton(minusBtnX, volY, stepBtnW, volH, () => {
    setArenaBgmVolume(Math.max(0, currentVol - 0.05));
    if (state.audioSystem?.playSFX) state.audioSystem.playSFX('skill_dash1', 0.15);
  });

  // 3. Interactive Slider Bar
  const plusBtnW = 20;
  const maxBtnW = 38;
  const sliderGap = 6;
  const sliderX = minusBtnX + stepBtnW + sliderGap;
  const rightControlsW = plusBtnW + sliderGap + maxBtnW;
  const sliderW = modalW - 40 - (muteBtnW + 6 + stepBtnW + sliderGap + sliderGap + rightControlsW);

  // Save bounds for drag interactions
  _volumeSliderBounds = { x: sliderX, y: volY, w: sliderW, h: volH };

  const trackH = 6;
  const trackY = volY + (volH - trackH) / 2;

  ctx.save();
  // Slider Track Background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, sliderX, trackY, sliderW, trackH, 3);
  ctx.fill();
  ctx.stroke();

  // Slider Filled Progress (Cyan to Amber gradient)
  if (currentVol > 0) {
    const fillW = Math.max(4, sliderW * currentVol);
    const grad = ctx.createLinearGradient(sliderX, trackY, sliderX + fillW, trackY);
    grad.addColorStop(0, '#00e5ff');
    grad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = grad;
    drawChamferedRect(ctx, sliderX, trackY, fillW, trackH, 3);
    ctx.fill();
  }

  // Glowing Slider Thumb Knob
  const thumbX = sliderX + sliderW * currentVol;
  const thumbY = volY + volH / 2;
  ctx.fillStyle = isMuted ? '#ef4444' : '#ffd700';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(thumbX, thumbY, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Slider click interaction
  _registerButton(sliderX - 4, volY - 2, sliderW + 8, volH + 4, () => {
    if (_lastModalMouseX >= sliderX - 4 && _lastModalMouseX <= sliderX + sliderW + 4) {
      const ratio = Math.max(0, Math.min(1, (_lastModalMouseX - sliderX) / sliderW));
      setArenaBgmVolume(ratio);
    }
  });

  // 4. Plus (+5%) Step Button
  const plusBtnX = sliderX + sliderW + sliderGap;
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, plusBtnX, volY, plusBtnW, volH, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', plusBtnX + plusBtnW / 2, volY + volH / 2);
  ctx.restore();

  _registerButton(plusBtnX, volY, plusBtnW, volH, () => {
    setArenaBgmVolume(Math.min(1.0, currentVol + 0.05));
    if (state.audioSystem?.playSFX) state.audioSystem.playSFX('skill_dash1', 0.15);
  });

  // 5. Max / 100% Quick Button
  const maxBtnX = plusBtnX + plusBtnW + sliderGap;
  ctx.save();
  ctx.fillStyle = 'rgba(245, 158, 11, 0.10)';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1;
  drawChamferedRect(ctx, maxBtnX, volY, maxBtnW, volH, 3);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f59e0b';
  ctx.font = '900 8.5px "Rajdhani", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('100%', maxBtnX + maxBtnW / 2, volY + volH / 2);
  ctx.restore();

  _registerButton(maxBtnX, volY, maxBtnW, volH, () => {
    setArenaBgmVolume(1.0);
    if (state.audioSystem?.playSFX) state.audioSystem.playSFX('skill_dash1', 0.2);
  });

  // Divider Line
  ctx.fillStyle = '#f59e0b';
  ctx.fillRect(mx + 20, my + 102, modalW - 40, 1.2);
  ctx.restore();

  // 3. Scrollable Track Cards Viewport
  const listX = mx + 20;
  const listY = my + 108;
  const itemW = modalW - 40;
  const itemH = 44;
  const gap = 5;
  const viewH = 265;

  const totalContentH = ARENA_BGM_TRACKS.length * (itemH + gap);
  const maxScroll = Math.max(0, totalContentH - viewH);
  _modalScrollY = Math.max(0, Math.min(maxScroll, _modalScrollY));

  // Clip cards to viewport
  ctx.save();
  ctx.beginPath();
  ctx.rect(listX - 4, listY, itemW + 8, viewH);
  ctx.clip();

  ARENA_BGM_TRACKS.forEach((track, idx) => {
    const itemX = listX;
    const itemY = listY + idx * (itemH + gap) - _modalScrollY;

    // Skip items completely outside viewport
    if (itemY + itemH < listY || itemY > listY + viewH) return;

    const isSelected = track.id === currentTrack.id;
    const isPreviewing = _previewTrackId === track.id;
    const hasAudio = track.id !== 'off';

    // 1. Card Container
    ctx.save();
    if (isSelected) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.18)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(245, 158, 11, 0.35)';
      ctx.shadowBlur = 8;
    } else {
      ctx.fillStyle = 'rgba(18, 22, 32, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.lineWidth = 1;
    }

    drawChamferedRect(ctx, itemX, itemY, itemW, itemH, 5);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 2. Track Icon
    const iconX = itemX + 18;
    const iconY = itemY + itemH / 2;
    ctx.save();
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const iconChar = track.id === 'random' ? '🎲' : (track.id === 'off' ? '🔇' : (track.isCustom ? '🎧' : '🎵'));
    ctx.fillText(iconChar, iconX, iconY);
    ctx.restore();

    // 3. Track Title & Subtitle
    const textX = itemX + 36;
    ctx.save();
    ctx.fillStyle = isSelected ? '#ffffff' : '#94a3b8';
    ctx.font = '900 12px "Outfit", "Rajdhani", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(track.name, textX, itemY + 8);

    ctx.fillStyle = isSelected ? '#f59e0b' : '#64748b';
    ctx.font = '900 8px "Rajdhani", sans-serif';
    const subtitle = track.id === 'random' 
      ? 'RANDOM SOUNDTRACK PER MATCH' 
      : (track.id === 'off' ? 'DISABLE ARENA SOUNDTRACK' : (track.isCustom ? 'IMPORTED CUSTOM AUDIO' : 'ARENA SOUNDTRACK'));
    ctx.fillText(subtitle, textX, itemY + 26);
    ctx.restore();

    // 4. Select / Active Pill Badge
    const selectBtnW = isSelected ? 60 : 50;
    const btnH = 22;
    const selectBtnX = itemX + itemW - selectBtnW - 8;
    const selectBtnY = itemY + (itemH - btnH) / 2;

    ctx.save();
    if (isSelected) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      drawChamferedRect(ctx, selectBtnX, selectBtnY, selectBtnW, btnH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffd700';
      ctx.font = '900 9px "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('● ACTIVE', selectBtnX + selectBtnW / 2, selectBtnY + btnH / 2);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      drawChamferedRect(ctx, selectBtnX, selectBtnY, selectBtnW, btnH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '900 9px "Rajdhani", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SELECT', selectBtnX + selectBtnW / 2, selectBtnY + btnH / 2);
    }
    ctx.restore();

    // 5. Play / Stop (Preview) Button
    const previewBtnW = 26;
    const previewBtnX = selectBtnX - previewBtnW - 6;
    const previewBtnY = selectBtnY;

    if (hasAudio) {
      ctx.save();
      if (isPreviewing) {
        ctx.fillStyle = 'rgba(0, 229, 255, 0.28)';
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 1.2;
        ctx.shadowColor = 'rgba(0, 229, 255, 0.4)';
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 1;
      }
      drawChamferedRect(ctx, previewBtnX, previewBtnY, previewBtnW, btnH, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isPreviewing ? '#00e5ff' : '#cbd5e1';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isPreviewing ? '⏸' : '▶', previewBtnX + previewBtnW / 2, previewBtnY + btnH / 2);
      ctx.restore();
    }

    // 6. Delete Button for Custom Imported Tracks
    let delBtnX = previewBtnX - 26;
    if (track.isCustom) {
      ctx.save();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 1;
      drawChamferedRect(ctx, delBtnX, previewBtnY, 20, btnH, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ef4444';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🗑️', delBtnX + 10, previewBtnY + btnH / 2);
      ctx.restore();
    }

    // Card click callback (select track)
    _registerButton(itemX, itemY, itemW, itemH, () => {
      setSavedArenaBgmId(track.id);
      if (typeof state !== 'undefined' && state.audioSystem?.playSFX) {
        state.audioSystem.playSFX('skill_dash1', 0.25);
      }
    });

    // Preview button click callback
    if (hasAudio) {
      _registerButton(previewBtnX, previewBtnY, previewBtnW, btnH, () => {
        previewTrack(track.id);
      });
    }

    // Delete custom track click callback
    if (track.isCustom) {
      _registerButton(delBtnX, previewBtnY, 20, btnH, () => {
        deleteCustomTrackFromDB(track.id);
      });
    }
  });

  ctx.restore();

  // Scrollbar indicator
  if (maxScroll > 0) {
    const scrollBarH = Math.max(20, (viewH / totalContentH) * viewH);
    const scrollBarY = listY + (_modalScrollY / maxScroll) * (viewH - scrollBarH);
    const scrollBarX = listX + itemW + 4;
    ctx.save();
    ctx.fillStyle = 'rgba(245, 158, 11, 0.5)';
    ctx.fillRect(scrollBarX, scrollBarY, 3, scrollBarH);
    ctx.restore();
  }

  // 4. Modal Footer: Confirm / Close Button
  const confirmH = 26;
  const confirmW = modalW - 40;
  const confirmX = mx + 20;
  const confirmY = my + modalH - confirmH - 12;

  ctx.save();
  ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.2;
  drawChamferedRect(ctx, confirmX, confirmY, confirmW, confirmH, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 10.5px "Rajdhani", "Outfit", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CONFIRM & CLOSE [ESC]', confirmX + confirmW / 2, confirmY + confirmH / 2);
  ctx.restore();

  _registerButton(confirmX, confirmY, confirmW, confirmH, () => {
    closeArenaBgmModal();
  });
}
