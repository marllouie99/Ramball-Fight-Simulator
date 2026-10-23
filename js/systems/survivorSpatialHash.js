/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SURVIVOR SPATIAL HASH GRID
 * Lightweight O(1) spatial partitioning for horde mode weapon hit queries.
 * Replaces O(N×M) brute-force distance checks in survivorSystem weapons.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Cell size 128px — tuned for typical weapon ranges 70–150px so most queries
 * touch at most 4–9 cells instead of iterating the entire mob array.
 *
 * Usage:
 *   import { survivorSpatialHash } from './survivorSpatialHash.js';
 *   survivorSpatialHash.clear();
 *   mobs.forEach(m => survivorSpatialHash.insert(m));
 *   const nearby = survivorSpatialHash.getNearby(px, py, 120);
 */

const CELL_SIZE = 128;
const INV_CELL  = 1 / CELL_SIZE;

// Large co-primes for integer hash combining (Teschner spatial hashing)
const HASH_X = 73856093;
const HASH_Y = 19349663;

/**
 * Compute integer cell key from cell coordinates.
 * @param {number} cx - Cell X index (integer)
 * @param {number} cy - Cell Y index (integer)
 * @returns {number}
 */
function cellKey(cx, cy) {
    return (cx * HASH_X) ^ (cy * HASH_Y);
}

class SurvivorSpatialHash {
    constructor(cellSize = 128) {
        this.cellSize = cellSize;
        this.invCell = 1 / cellSize;
        /** @type {Map<number, Array>} */
        this._cells = new Map();
    }

    /**
     * Clear all cells for a new frame.
     */
    clear() {
        this._cells.clear();
    }

    /**
     * Insert an entity into the grid.
     * The entity must have numeric `x` and `y` properties.
     * @param {object} entity
     */
    insert(entity) {
        const cx = Math.floor(entity.x * this.invCell);
        const cy = Math.floor(entity.y * this.invCell);

        // Store cell coords on entity for potential future use (e.g. neighbor queries)
        entity._hashCX = cx;
        entity._hashCY = cy;

        const key = cellKey(cx, cy);
        let bucket = this._cells.get(key);
        if (!bucket) {
            bucket = [];
            this._cells.set(key, bucket);
        }
        bucket.push(entity);
    }

    /**
     * Return all entities whose cells overlap the axis-aligned bounding box
     * defined by (x ± radius, y ± radius).
     *
     * NOTE: This does NOT distance-filter — callers should still do a final
     * distance² check if exact circular range is needed. The spatial hash
     * eliminates the vast majority of candidates cheaply.
     *
     * @param {number} x      - Query center X
     * @param {number} y      - Query center Y
     * @param {number} radius - Query radius
     * @returns {Array} Array of candidate entities
     */
    getNearby(x, y, radius) {
        const minCX = Math.floor((x - radius) * this.invCell);
        const maxCX = Math.floor((x + radius) * this.invCell);
        const minCY = Math.floor((y - radius) * this.invCell);
        const maxCY = Math.floor((y + radius) * this.invCell);

        const result = [];

        for (let cx = minCX; cx <= maxCX; cx++) {
            for (let cy = minCY; cy <= maxCY; cy++) {
                const bucket = this._cells.get(cellKey(cx, cy));
                if (bucket) {
                    for (let i = 0; i < bucket.length; i++) {
                        result.push(bucket[i]);
                    }
                }
            }
        }

        return result;
    }
}

/** Singleton instance for global survivor mode use */
const survivorSpatialHash = new SurvivorSpatialHash();

export { SurvivorSpatialHash, survivorSpatialHash };
