/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SOUND SPRITE SYSTEM — Web Audio SFX Sprite Packing & Virtual Slicing Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Bundles dozens of short combat SFX, UI clicks, footsteps, and impact sounds
 * into concatenated AudioBuffer slices.
 * 
 * Benefits:
 * 1. Reduces hundreds of individual HTTP asset requests down to single audio sheets.
 * 2. Instant zero-latency playback using Web Audio start(time, offset, duration).
 * 3. Dynamic in-memory virtual buffer stitching: concatenates decoded individual
 *    buffers into a single memory block with silence padding to prevent bleed.
 * 4. Graceful fallback: transparently falls back to individual file requests if
 *    sound sprite sheet is missing or sound key is not packed.
 */

export const CORE_COMBAT_SFX_PATHS = [
  'Assets/Sound Effects/Attacks/fleshhit.mp3',
  'Assets/Sound Effects/Attacks/punch.mp3',
  'Assets/Sound Effects/Attacks/swordswing.mp3',
  'Assets/Sound Effects/Attacks/groundSmash.mp3',
  'Assets/Sound Effects/Attacks/explosion.mp3',
  'Assets/Sound Effects/Attacks/spaceshot.mp3',
  'Assets/Sound Effects/Attacks/laserpew.mp3',
  'Assets/Sound Effects/Attacks/heavypunch1.mp3',
  'Assets/Sound Effects/Attacks/heavypunch2.mp3',
  'Assets/Sound Effects/Attacks/heavypunch3.mp3',
  'Assets/Sound Effects/Attacks/energysword.mp3',
  'Assets/Sound Effects/Attacks/energysword2.mp3',
  'Assets/Sound Effects/Attacks/thunderstrike.mp3',
  'Assets/Sound Effects/Attacks/spikestab.mp3',
  'Assets/Sound Effects/Attacks/shurikenthrow.mp3',
  'Assets/Sound Effects/Attacks/syctheattack.mp3'
];

class SoundSpriteManager {
  constructor() {
    this.spriteSheets = new Map(); // id -> { url, buffer, loadingPromise, sprites: Map(key -> {offset, duration}) }
    this.keyToSheetMap = new Map(); // sfxKey / fileSrc -> { sheetId, offset, duration }
    this._initDefaultSheets();
  }

  _initDefaultSheets() {
    // Register default core combat hits virtual sheet descriptor
    this.registerSpriteSheet('core_combat_hits', 'virtual://core_combat_hits', {
      'punch': [0.0, 0.45],
      'Assets/Sound Effects/Attacks/punch.mp3': [0.0, 0.45],
      'fleshhit': [0.5, 0.40],
      'Assets/Sound Effects/Attacks/fleshhit.mp3': [0.5, 0.40],
      'swordswing': [0.95, 0.55],
      'Assets/Sound Effects/Attacks/swordswing.mp3': [0.95, 0.55],
      'groundSmash': [1.55, 0.70],
      'Assets/Sound Effects/Attacks/groundSmash.mp3': [1.55, 0.70],
      'explosion': [2.30, 0.85],
      'Assets/Sound Effects/Attacks/explosion.mp3': [2.30, 0.85],
      'spaceshot': [3.20, 0.65],
      'Assets/Sound Effects/Attacks/spaceshot.mp3': [3.20, 0.65]
    });
  }

  /**
   * Register a sound sprite sheet definition.
   * @param {string} sheetId - Unique identifier (e.g. 'core_combat_hits')
   * @param {string} sheetUrl - Path to the concatenated audio file
   * @param {Record<string, [number, number]>} spriteSlices - Map of soundKey -> [offsetInSeconds, durationInSeconds]
   * @param {boolean} [isVirtual=false] - Whether this is an in-memory stitched virtual sheet
   */
  registerSpriteSheet(sheetId, sheetUrl, spriteSlices, isVirtual = false) {
    if (!sheetId || !sheetUrl || !spriteSlices) return;

    const isVirt = Boolean(isVirtual || (sheetUrl && sheetUrl.startsWith('virtual://')));
    const sliceMap = new Map();
    for (const [key, slice] of Object.entries(spriteSlices)) {
      if (Array.isArray(slice) && slice.length >= 2) {
        const offset = Number(slice[0]) || 0;
        const duration = Number(slice[1]) || 0.1;
        const data = { sheetId, offset, duration };
        const cleanKey = String(key).replace(/\\/g, '/');
        sliceMap.set(cleanKey, data);
        this.keyToSheetMap.set(cleanKey, data);
        this.keyToSheetMap.set(cleanKey.toLowerCase(), data);
      }
    }

    this.spriteSheets.set(sheetId, {
      id: sheetId,
      url: sheetUrl,
      buffer: null,
      loadingPromise: null,
      sprites: sliceMap,
      isVirtual: isVirt
    });
  }

  /**
   * Check if a given sound key or file source is registered in a sound sprite sheet.
   * @param {string} keyOrSrc
   * @returns {boolean}
   */
  hasSprite(keyOrSrc) {
    if (!keyOrSrc) return false;
    const cleanKey = String(keyOrSrc).replace(/\\/g, '/');
    return this.keyToSheetMap.has(cleanKey) || this.keyToSheetMap.has(cleanKey.toLowerCase());
  }

  /**
   * Retrieve the sprite slice metadata for a given key.
   * @param {string} keyOrSrc
   * @returns {{ sheetId: string, offset: number, duration: number } | null}
   */
  getSpriteInfo(keyOrSrc) {
    if (!keyOrSrc) return null;
    const cleanKey = String(keyOrSrc).replace(/\\/g, '/');
    return this.keyToSheetMap.get(cleanKey) || this.keyToSheetMap.get(cleanKey.toLowerCase()) || null;
  }

  /**
   * Preload and decode a registered sound sprite sheet into memory.
   * @param {string} sheetId
   * @param {AudioContext} audioCtx
   * @returns {Promise<AudioBuffer|null>}
   */
  async loadSpriteSheet(sheetId, audioCtx) {
    const sheet = this.spriteSheets.get(sheetId);
    if (!sheet) return null;
    if (sheet.buffer) return sheet.buffer;
    if (sheet.loadingPromise) return sheet.loadingPromise;

    // Never invoke Fetch API on in-memory virtual URIs (e.g. 'virtual://...') to prevent CSP violations
    if (sheet.isVirtual || (sheet.url && sheet.url.startsWith('virtual://'))) {
      return sheet.buffer || null;
    }

    sheet.loadingPromise = (async () => {
      try {
        if (!audioCtx) {
          const AudioContextClass = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) ||
                                    (typeof globalThis !== 'undefined' && (globalThis.AudioContext || globalThis.webkitAudioContext));
          if (AudioContextClass) {
            try { audioCtx = new AudioContextClass(); } catch (e) {}
          }
        }
        if (!audioCtx) return null;

        const response = await fetch(sheet.url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuf = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuf);
        sheet.buffer = audioBuffer;
        return audioBuffer;
      } catch (err) {
        // Fallback to standalone files
        return null;
      } finally {
        sheet.loadingPromise = null;
      }
    })();

    return sheet.loadingPromise;
  }

  /**
   * Dynamic in-memory stitcher: takes a dictionary of { [key]: AudioBuffer } and concatenates
   * them into a single continuous AudioBuffer, registering slices and offsets with silence padding.
   * @param {string} sheetId - Unique sheet ID
   * @param {Record<string, AudioBuffer>} bufferMap - Map of soundKey -> AudioBuffer
   * @param {AudioContext} audioCtx
   * @param {number} [paddingSec=0.05] - Silence padding between slices
   * @returns {AudioBuffer|null}
   */
  stitchBuffersToSpriteSheet(sheetId, bufferMap, audioCtx, paddingSec = 0.05) {
    if (!sheetId || !bufferMap || typeof bufferMap !== 'object') return null;
    const entries = Object.entries(bufferMap).filter(([k, b]) => b && typeof b.duration === 'number');
    if (entries.length === 0) return null;

    if (!audioCtx) {
      const AudioContextClass = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) ||
                                (typeof globalThis !== 'undefined' && (globalThis.AudioContext || globalThis.webkitAudioContext));
      if (AudioContextClass) {
        try { audioCtx = new AudioContextClass(); } catch (e) {}
      }
    }
    if (!audioCtx) return null;

    const sampleRate = audioCtx.sampleRate || 44100;
    const paddingSamples = Math.floor(paddingSec * sampleRate);
    let maxChannels = 1;
    let totalSamples = 0;

    for (const [, buf] of entries) {
      maxChannels = Math.max(maxChannels, buf.numberOfChannels || 1);
      const bufLen = buf.length || Math.floor(buf.duration * sampleRate);
      totalSamples += bufLen + paddingSamples;
    }

    let compositeBuffer = null;
    if (typeof audioCtx.createBuffer === 'function') {
      try {
        compositeBuffer = audioCtx.createBuffer(maxChannels, totalSamples, sampleRate);
      } catch (e) {}
    }
    if (!compositeBuffer) {
      const AudioBufferClass = (typeof AudioBuffer !== 'undefined' ? AudioBuffer : (typeof globalThis !== 'undefined' ? globalThis.AudioBuffer : null));
      if (AudioBufferClass) {
        try {
          compositeBuffer = new AudioBufferClass({ numberOfChannels: maxChannels, length: totalSamples, sampleRate, duration: totalSamples / sampleRate });
        } catch (e2) {}
      }
    }
    if (!compositeBuffer) {
      compositeBuffer = {
        numberOfChannels: maxChannels,
        length: totalSamples,
        sampleRate,
        duration: totalSamples / sampleRate
      };
    }

    const sliceMap = new Map();
    let currentSampleOffset = 0;

    for (const [key, buf] of entries) {
      const offsetSec = currentSampleOffset / sampleRate;
      const durationSec = buf.duration;
      const data = { sheetId, offset: offsetSec, duration: durationSec };

      const cleanKey = String(key).replace(/\\/g, '/');
      sliceMap.set(cleanKey, data);
      this.keyToSheetMap.set(cleanKey, data);
      this.keyToSheetMap.set(cleanKey.toLowerCase(), data);

      const bufLen = buf.length || Math.floor(buf.duration * sampleRate);
      if (compositeBuffer && typeof compositeBuffer.copyToChannel === 'function') {
        for (let ch = 0; ch < maxChannels; ch++) {
          const srcCh = Math.min(ch, (buf.numberOfChannels || 1) - 1);
          if (typeof buf.getChannelData === 'function') {
            const srcData = buf.getChannelData(srcCh);
            compositeBuffer.copyToChannel(srcData, ch, currentSampleOffset);
          }
        }
      }
      currentSampleOffset += bufLen + paddingSamples;
    }

    this.spriteSheets.set(sheetId, {
      id: sheetId,
      url: `virtual://${sheetId}`,
      buffer: compositeBuffer,
      loadingPromise: null,
      sprites: sliceMap,
      isVirtual: true
    });

    return compositeBuffer;
  }

  /**
   * Automatically builds or warms up the virtual core combat sprite sheet in memory.
   * @param {AudioContext} audioCtx
   * @param {string[]} [sfxPaths=CORE_COMBAT_SFX_PATHS]
   * @returns {Promise<AudioBuffer|null>}
   */
  async buildVirtualCombatSpriteSheet(audioCtx, sfxPaths = CORE_COMBAT_SFX_PATHS) {
    if (this.spriteSheets.has('core_combat_hits') && this.spriteSheets.get('core_combat_hits').buffer) {
      return this.spriteSheets.get('core_combat_hits').buffer;
    }

    if (!audioCtx) {
      const AudioContextClass = (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) ||
                                (typeof globalThis !== 'undefined' && (globalThis.AudioContext || globalThis.webkitAudioContext));
      if (AudioContextClass) {
        try { audioCtx = new AudioContextClass(); } catch (e) {}
      }
    }
    if (!audioCtx) return null;

    const bufferMap = {};
    for (const path of sfxPaths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          if (audioBuffer) {
            bufferMap[path] = audioBuffer;
          }
        }
      } catch (err) {}
    }

    return this.stitchBuffersToSpriteSheet('core_combat_hits', bufferMap, audioCtx);
  }

  /**
   * Attempt to retrieve decoded AudioBuffer and slice timing for zero-latency sprite playback.
   * @param {string} keyOrSrc
   * @returns {{ buffer: AudioBuffer, offset: number, duration: number } | null}
   */
  getSpriteAudio(keyOrSrc) {
    const info = this.getSpriteInfo(keyOrSrc);
    if (!info) return null;

    const sheet = this.spriteSheets.get(info.sheetId);
    if (!sheet || !sheet.buffer) return null;

    return {
      buffer: sheet.buffer,
      offset: info.offset,
      duration: info.duration
    };
  }

  /**
   * Returns a diagnostic list of all registered sound sprite sheets and their status.
   * @returns {Array<{ id: string, url: string, isLoaded: boolean, isVirtual: boolean, sliceCount: number }>}
   */
  getRegisteredSheets() {
    const result = [];
    for (const [id, sheet] of this.spriteSheets.entries()) {
      result.push({
        id,
        url: sheet.url,
        isLoaded: Boolean(sheet.buffer),
        isVirtual: Boolean(sheet.isVirtual),
        sliceCount: sheet.sprites ? sheet.sprites.size : 0
      });
    }
    return result;
  }

  /**
   * Returns statistics about the sound sprite manager.
   * @returns {{ totalSheets: number, loadedSheets: number, totalSlices: number }}
   */
  getSpriteStats() {
    let loadedSheets = 0;
    let totalSlices = 0;
    for (const sheet of this.spriteSheets.values()) {
      if (sheet.buffer) loadedSheets++;
      if (sheet.sprites) totalSlices += sheet.sprites.size;
    }
    return {
      totalSheets: this.spriteSheets.size,
      loadedSheets,
      totalSlices
    };
  }

  /**
   * Clears decoded sprite buffer memory while keeping registration metadata intact.
   */
  clearSpriteBuffers() {
    for (const sheet of this.spriteSheets.values()) {
      sheet.buffer = null;
      sheet.loadingPromise = null;
    }
  }
}

export const soundSpriteManager = new SoundSpriteManager();
