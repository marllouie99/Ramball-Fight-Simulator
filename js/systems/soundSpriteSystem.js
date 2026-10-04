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
 * 3. Graceful fallback: transparently falls back to individual file requests if
 *    sound sprite sheet is missing or sound key is not packed.
 */

class SoundSpriteManager {
  constructor() {
    this.spriteSheets = new Map(); // id -> { url, buffer, loadingPromise, sprites: Map(key -> {offset, duration}) }
    this.keyToSheetMap = new Map(); // sfxKey / fileSrc -> { sheetId, offset, duration }
  }

  /**
   * Register a sound sprite sheet definition.
   * @param {string} sheetId - Unique identifier (e.g. 'common_combat_sfx')
   * @param {string} sheetUrl - Path to the concatenated audio file
   * @param {Record<string, [number, number]>} spriteSlices - Map of soundKey -> [offsetInSeconds, durationInSeconds]
   */
  registerSpriteSheet(sheetId, sheetUrl, spriteSlices) {
    if (!sheetId || !sheetUrl || !spriteSlices) return;

    const sliceMap = new Map();
    for (const [key, slice] of Object.entries(spriteSlices)) {
      if (Array.isArray(slice) && slice.length >= 2) {
        const offset = Number(slice[0]) || 0;
        const duration = Number(slice[1]) || 0.1;
        const data = { sheetId, offset, duration };
        sliceMap.set(key, data);
        this.keyToSheetMap.set(key, data);
        this.keyToSheetMap.set(key.toLowerCase(), data);
      }
    }

    this.spriteSheets.set(sheetId, {
      id: sheetId,
      url: sheetUrl,
      buffer: null,
      loadingPromise: null,
      sprites: sliceMap
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

    sheet.loadingPromise = (async () => {
      try {
        if (!audioCtx) {
          const AudioContextClass = (typeof window !== 'undefined') && (window.AudioContext || window.webkitAudioContext);
          if (AudioContextClass) audioCtx = new AudioContextClass();
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
}

export const soundSpriteManager = new SoundSpriteManager();
