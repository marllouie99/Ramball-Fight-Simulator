// ─────────────────────────────────────────────
// ANNOUNCER SOUND EFFECTS CONFIG
// ─────────────────────────────────────────────
// Configure sound effects for the announcer (rounds, deaths, etc.)
// You can adjust volume and speed (playbackRate).

export const ANNOUNCER_SOUNDS = {
    round1: {
        src: 'Assets/Sound Effects/Announcer/round1.mp3',
        volume: 1.0,
        speed: 1.4,
        offset: 0,
    },
    round2: {
        src: 'Assets/Sound Effects/Announcer/round2.mp3',
        volume: 1.0,
        speed: 1.5,
        offset: 0,
    },
    round3: {
        src: 'Assets/Sound Effects/Announcer/round3.mp3',
        volume: 1.0,
        speed: 1.5,
        offset: 0,
    },
    round4: {
        src: 'Assets/Sound Effects/Announcer/round4.mp3',
        volume: 1.0,
        speed: 1.5,
        offset: 0,
    },
    finalround: {
        src: 'Assets/Sound Effects/Announcer/finalround.mp3',
        volume: 1.0,
        speed: 1.0,
        offset: 0,
    },
    faah: {
        src: 'Assets/Sound Effects/Announcer/faah.mp3',
        volume: 0.4,
        speed: 1.0,
        offset: 0.2,
    }
};

/**
 * Helper to extract just the source paths for preloading.
 * @returns {string[]} Array of file paths
 */
export function getAnnouncerSoundPaths() {
    return Object.values(ANNOUNCER_SOUNDS).map((cfg) => cfg.src);
}

/**
 * Helper to get the sound config for a given key.
 * @param {string} key 
 * @returns {{src: string, volume: number, speed: number, offset?: number} | null}
 */
export function getAnnouncerSound(key) {
    return ANNOUNCER_SOUNDS[key] || null;
}
